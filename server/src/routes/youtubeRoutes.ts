import express from 'express';
import { normalizeYoutubeToReview, upsertReviewToSupabase } from '../services/youtube/captionIngestService';
import { fetchYouTubeVideoMetadata, extractGameFromMetadata, createSlug } from '../services/youtube/youtubeApiService';
import { getHybridTranscript, HybridTranscriptOptions } from '../services/youtube/hybridTranscriptService';
import { analyzeTextWithBiasAdjustmentFull } from '../services/sentimentService';
import { supabase } from '../config/database';

const router = express.Router();

const flattenSentiment = (obj: any) => {
  if (!obj) return {};
  if (obj.sentiment && typeof obj.sentiment === 'object') {
    return { ...obj.sentiment, ...Object.fromEntries(Object.entries(obj).filter(([k]) => k !== 'sentiment')) };
  }
  return obj;
};

const normalizeSentiment = (obj: any) => ({
  summary: obj.summary || '',
  sentimentScore: obj.sentimentScore ?? obj.sentiment_score ?? 0,
  verdict: obj.verdict || '',
  sentimentSummary: obj.sentimentSummary ?? obj.sentiment_summary ?? '',
  biasIndicators: obj.biasIndicators ?? obj.bias_indicators ?? [],
  alsoRecommends: obj.alsoRecommends ?? obj.also_recommends ?? [],
  pros: obj.pros || [],
  cons: obj.cons || [],
  reviewSummary: obj.reviewSummary ?? obj.review_summary ?? '',
  biasDetection: obj.biasDetection ?? obj.bias_detection ?? {},
  biasAdjustment: obj.biasAdjustment ?? obj.bias_adjustment ?? {},
  sentimentSnapshot: obj.sentimentSnapshot ?? obj.sentiment_snapshot ?? {},
  culturalContext: obj.culturalContext ?? obj.cultural_context ?? {}
});

/**
 * Enhanced YouTube video processing with metadata integration
 */
const processYouTubeVideo = async (videoId: string) => {
  // Fetch metadata from YouTube Data v3 API
  const metadata = await fetchYouTubeVideoMetadata(videoId);
  
  // Extract game title from metadata
  const extractedGameTitle = extractGameFromMetadata(metadata);
  const gameSlug = extractedGameTitle ? createSlug(extractedGameTitle) : 'unknown-game';
  const creatorSlug = createSlug(metadata.channelTitle);
  
  // Try hybrid transcript (captions first, then audio fallback)
  console.log(`[API] Starting hybrid transcript for ${videoId}`);
  const transcriptResult = await getHybridTranscript(videoId, {
    allowAudioFallback: true,
    maxCostUSD: 0.50, // Limit to $0.50 per video
    maxDurationMinutes: 20 // Limit to 20 minutes
  });

  console.log(`[API] Transcript result: ${transcriptResult.method}, cost: $${(transcriptResult.cost || 0).toFixed(3)}`);

  // Create review with available data
  const review = await normalizeYoutubeToReview({
    videoId,
    transcript: transcriptResult.transcript,
    gameSlug,
    creatorSlug,
    gameTitle: extractedGameTitle || metadata.title,
    creatorName: metadata.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${metadata.channelId}`,
    publishedAt: metadata.publishedAt
  });

  // Enhance review with YouTube metadata and transcript info
  return {
    ...review,
    title: metadata.title,
    description: metadata.description,
    thumbnails: metadata.thumbnails,
    tags: metadata.tags,
    publishedAt: metadata.publishedAt,
    transcriptMethod: transcriptResult.method,
    transcriptCost: transcriptResult.cost,
    transcriptError: transcriptResult.error,
    transcriptDebug: transcriptResult.debug
  };
};

/**
 * POST /api/youtube/process
 * Processes a YouTube video: extracts metadata, captions, analyzes sentiment
 */
router.post('/process', async (req, res) => {
  console.log('[API] /process endpoint hit');
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    // DB lookup first
    const { data: existingReview, error: dbError } = await supabase
      .from('reviews')
      .select('*, sentiment')
      .eq('video_url', videoUrl)
      .maybeSingle();
    if (dbError) {
      throw new Error(`Database lookup failed: ${dbError.message}`);
    }
    if (existingReview && existingReview.sentiment) {
      const flatSentiment = flattenSentiment(existingReview.sentiment);
      const normalizedSentiment = normalizeSentiment(flatSentiment);
      console.log('[API] Cache hit, returning existing review:', JSON.stringify(existingReview, null, 2));
      return res.json({
        success: true,
        reviewId: existingReview.video_url,
        sentiment: normalizedSentiment,
        metadata: {
          gameTitle: existingReview.game_title,
          creatorName: existingReview.creator_name,
          videoTitle: existingReview.title,
          channelTitle: existingReview.channel_title,
          publishedAt: existingReview.published_at
        },
        transcript: {
          method: existingReview.transcript_method,
          cost: existingReview.transcript_cost,
          length: existingReview.transcript ? existingReview.transcript.length : 0
        }
      });
    }
    console.log('[API] No cache, running pipeline');
    // Not found or sentiment missing, run pipeline
    console.log(`[API] Processing YouTube video: ${videoId}`);
    const review = await processYouTubeVideo(videoId);
    let sentiment;
    if (review.transcript && review.transcript.trim().length > 0) {
      const llmResult = await analyzeTextWithBiasAdjustmentFull(
        review.transcript!,
        'gpt-3.5-turbo',
        undefined,
        undefined,
        review.title,
        review.title
      );
      sentiment = normalizeSentiment(flattenSentiment(llmResult));
      console.log('[API] Sentiment result:', JSON.stringify(sentiment, null, 2));
    } else {
      console.warn(`[API] No transcript available for ${videoId}, using default sentiment values`);
      sentiment = normalizeSentiment(flattenSentiment({
        summary: '',
        sentimentScore: 0,
        verdict: '',
        sentimentSummary: '',
        biasIndicators: [],
        alsoRecommends: [],
        pros: [],
        cons: [],
        reviewSummary: '',
        biasDetection: {},
        biasAdjustment: {},
        sentimentSnapshot: {},
        culturalContext: {}
      }));
    }
    // Only save if transcript is non-empty and sentiment is not default/empty
    const isValidSentiment = sentiment && (
      sentiment.sentimentScore !== 0 ||
      (sentiment.summary && sentiment.summary.trim().length > 0) ||
      (sentiment.pros && sentiment.pros.length > 0) ||
      (sentiment.cons && sentiment.cons.length > 0)
    );
    if (review.transcript && review.transcript.trim().length > 0 && isValidSentiment) {
      const {
        title: videoTitle,
        description: videoDescription,
        thumbnails,
        tags,
        publishedAt,
        transcriptDebug,
        transcriptError,
        transcriptMethod,
        ...reviewForDatabase
      } = review;
      // Attach the nested sentiment object for DB
      const reviewToUpsert = { ...reviewForDatabase, sentiment };
      console.log('[API] Upserting review:', JSON.stringify(reviewToUpsert, null, 2));
      await upsertReviewToSupabase(reviewToUpsert);
    }
    // Clean API response: only nested sentiment, no flattened fields
    res.json({
      success: true,
      reviewId: review.videoUrl,
      sentiment,
      metadata: {
        gameTitle: review.title,
        creatorName: (review as any).creatorName || '',
        videoTitle: review.title,
        channelTitle: (review as any).channelTitle || (review as any).creatorName || '',
        publishedAt: review.publishedAt
      },
      transcript: {
        method: review.transcriptMethod,
        cost: review.transcriptCost,
        length: review.transcript ? review.transcript.length : 0,
        error: review.transcriptError,
        debug: review.transcriptDebug
      }
    });
  } catch (error: any) {
    console.error('[API] YouTube processing error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process YouTube video'
    });
  }
});

/**
 * GET /api/youtube/video/:videoId
 * Gets existing review data for a YouTube video
 */
router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Query database for existing review
    const { data: review, error } = await supabase
      .from('reviews')
      .select(`
        *,
        games(title, slug),
        creators(name, slug)
      `)
      .eq('video_url', videoUrl)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Database lookup failed: ${error.message}`);
    }
    
    res.json({ 
      exists: !!review,
      review: review || null
    });
    
  } catch (error: any) {
    console.error('[API] YouTube lookup error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to lookup YouTube video' 
    });
  }
});

/**
 * GET /api/youtube/metadata/:videoId
 * Gets YouTube metadata without processing the full video
 */
router.get('/metadata/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const metadata = await fetchYouTubeVideoMetadata(videoId);
    const extractedGameTitle = extractGameFromMetadata(metadata);
    
    res.json({
      ...metadata,
      extractedGameTitle,
      suggestedGameSlug: extractedGameTitle ? createSlug(extractedGameTitle) : null,
      suggestedCreatorSlug: createSlug(metadata.channelTitle)
    });
    
  } catch (error: any) {
    console.error('[API] YouTube metadata error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch YouTube metadata' 
    });
  }
});

/**
 * GET /api/youtube/transcript/:videoId
 * Gets transcript using hybrid approach (captions first, then audio fallback)
 */
router.get('/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { 
      allowAudio = 'true', 
      maxCost = '0.50',
      maxDuration = '20'
    } = req.query;

    const options: HybridTranscriptOptions = {
      allowAudioFallback: allowAudio === 'true',
      maxCostUSD: parseFloat(maxCost as string),
      maxDurationMinutes: parseInt(maxDuration as string)
    };

    const result = await getHybridTranscript(videoId, options);
    
    res.json({
      videoId,
      ...result,
      options
    });
    
  } catch (error: any) {
    console.error('[API] YouTube transcript error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get YouTube transcript' 
    });
  }
});

export default router; 