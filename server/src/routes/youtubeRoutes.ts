import express from 'express';
import { normalizeYoutubeToReview, upsertReviewToSupabase } from '../services/youtube/captionIngestService';
import { fetchYouTubeVideoMetadata, extractGameFromMetadata, createSlug } from '../services/youtube/youtubeApiService';
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
  
  // Use existing caption ingestion with enhanced metadata
  const review = await normalizeYoutubeToReview({
    videoId,
    transcript: '', // Will be fetched by normalizeYoutubeToReview
    gameSlug,
    creatorSlug,
    gameTitle: extractedGameTitle || metadata.title,
    creatorName: metadata.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${metadata.channelId}`,
    publishedAt: metadata.publishedAt
  });

  // Enhance review with YouTube metadata
  return {
    ...review,
    title: metadata.title,
    description: metadata.description,
    thumbnails: metadata.thumbnails,
    tags: metadata.tags,
    publishedAt: metadata.publishedAt
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
    
    // Step 2: Analyze sentiment with LLM
    const sentiment = await analyzeText(
      review.transcript!, 
      'gpt-3.5-turbo', 
      undefined, 
      undefined, 
      review.title
    );
    
    // Step 3: Merge sentiment analysis into review
    const completeReview = {
      ...review,
      sentimentSummary: sentiment.sentimentSummary,
      biasIndicators: sentiment.biasIndicators,
      alsoRecommends: sentiment.alsoRecommends,
      pros: sentiment.pros,
      cons: sentiment.cons,
      reviewSummary: sentiment.reviewSummary,
      score: sentiment.sentimentScore
    };

    // Step 4: Save to database
    await upsertReviewToSupabase(completeReview);

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

export default router; 