import express from 'express';
import { normalizeYoutubeToReview, upsertReviewToSupabase } from '../services/youtube/captionIngestService';
import { fetchYouTubeVideoMetadata, extractGameFromMetadata, createSlug } from '../services/youtube/youtubeApiService';
import { getHybridTranscript, HybridTranscriptOptions } from '../services/youtube/hybridTranscriptService';
import { analyzeText } from '../services/sentimentService';
import { supabase } from '../config/database';

const router = express.Router();

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
    transcriptError: transcriptResult.error
  };
};

/**
 * POST /api/youtube/process
 * Processes a YouTube video: extracts metadata, captions, analyzes sentiment
 */
router.post('/process', async (req, res) => {
  try {
    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    console.log(`[API] Processing YouTube video: ${videoId}`);

    // Step 1: Process YouTube video (metadata + captions)
    const review = await processYouTubeVideo(videoId);
    
    // Step 2: Analyze sentiment with LLM (only if we have a transcript)
    let sentiment;
    if (review.transcript && review.transcript.trim().length > 0) {
      sentiment = await analyzeText(
        review.transcript!, 
        'gpt-3.5-turbo', 
        undefined, 
        undefined, 
        review.title
      );
    } else {
      // Create default sentiment analysis for videos without transcripts
      console.warn(`[API] No transcript available for ${videoId}, using default sentiment values`);
      sentiment = {
        summary: null,
        sentimentScore: null,
        verdict: null,
        sentimentSummary: 'No transcript available',
        biasIndicators: [],
        alsoRecommends: [],
        pros: [],
        cons: [],
        reviewSummary: 'No transcript available for analysis'
      };
    }
    
    // Step 3: Merge sentiment analysis into review
    const completeReview = {
      ...review,
      sentimentSummary: sentiment.sentimentSummary || 'No sentiment analysis available',
      biasIndicators: sentiment.biasIndicators,
      alsoRecommends: sentiment.alsoRecommends,
      pros: sentiment.pros,
      cons: sentiment.cons,
      reviewSummary: sentiment.reviewSummary || 'No review summary available',
      score: sentiment.sentimentScore ?? 5 // Default to neutral score if null
    };

    // Filter out extra YouTube metadata fields that don't exist in reviews table
    const {
      title: videoTitle,
      description: videoDescription,
      thumbnails,
      tags,
      publishedAt,
      ...reviewForDatabase
    } = completeReview;

    // Step 4: Save to database (only fields that exist in reviews table)
    await upsertReviewToSupabase(reviewForDatabase);

    res.json({
      success: true,
      reviewId: completeReview.videoUrl,
      sentiment,
      metadata: {
        gameTitle: review.title,
        creatorName: review.title, // TODO: Fix this to use actual creator name
        videoTitle: review.title,
        channelTitle: (review as any).channelTitle,
        publishedAt: review.publishedAt
      },
      transcript: {
        method: (review as any).transcriptMethod,
        cost: (review as any).transcriptCost,
        error: (review as any).transcriptError,
        length: completeReview.transcript?.length || 0
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