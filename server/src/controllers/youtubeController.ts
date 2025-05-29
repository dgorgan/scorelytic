import { Request, Response } from 'express';
import {
  normalizeYoutubeToReview,
  upsertReviewToSupabase,
} from '@/services/youtube/captionIngestService';
import {
  fetchYouTubeVideoMetadata,
  extractGameFromMetadata,
  createSlug,
} from '@/services/youtube/youtubeApiService';
import { getHybridTranscript } from '@/services/youtube/hybridTranscriptService';
import { analyzeTextWithBiasAdjustmentFull } from '@/services/sentiment';
import { supabase } from '@/config/database';

const flattenSentiment = (obj: any) => {
  if (!obj) return {};
  if (obj.sentiment && typeof obj.sentiment === 'object') {
    return {
      ...obj.sentiment,
      ...Object.fromEntries(Object.entries(obj).filter(([k]) => k !== 'sentiment')),
    };
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
  culturalContext: obj.culturalContext ?? obj.cultural_context ?? {},
});

const processYouTubeVideo = async (videoId: string) => {
  const metadata = await fetchYouTubeVideoMetadata(videoId);
  const extractedGameTitle = extractGameFromMetadata(metadata);
  const gameSlug = extractedGameTitle ? createSlug(extractedGameTitle) : 'unknown-game';
  const creatorSlug = createSlug(metadata.channelTitle);
  const transcriptResult = await getHybridTranscript(videoId, {
    allowAudioFallback: true,
    maxCostUSD: 0.5,
    maxDurationMinutes: 20,
  });
  const review = await normalizeYoutubeToReview({
    videoId,
    transcript: transcriptResult.transcript,
    gameSlug,
    creatorSlug,
    gameTitle: extractedGameTitle || metadata.title,
    creatorName: metadata.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${metadata.channelId}`,
    publishedAt: metadata.publishedAt,
  });
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
    transcriptDebug: transcriptResult.debug,
  };
};

export const youtubeController = {
  processVideo: async (req: Request, res: Response) => {
    try {
      const { videoId } = req.body;
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
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
        return res.json({
          success: true,
          reviewId: existingReview.video_url,
          sentiment: normalizedSentiment,
          metadata: {
            gameTitle: existingReview.game_title,
            creatorName: existingReview.creator_name,
            videoTitle: existingReview.title,
            channelTitle: existingReview.channel_title,
            publishedAt: existingReview.published_at,
          },
          transcript: {
            method: existingReview.transcript_method,
            cost: existingReview.transcript_cost,
            length: existingReview.transcript ? existingReview.transcript.length : 0,
          },
        });
      }
      const review = await processYouTubeVideo(videoId);
      let sentiment;
      if (review.transcript && review.transcript.trim().length > 0) {
        const llmResult = await analyzeTextWithBiasAdjustmentFull(
          review.transcript!,
          'gpt-3.5-turbo',
          undefined,
          undefined,
          review.title,
          review.title,
        );
        sentiment = normalizeSentiment(flattenSentiment(llmResult));
      } else {
        sentiment = normalizeSentiment(
          flattenSentiment({
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
            culturalContext: {},
          }),
        );
      }
      const isValidSentiment =
        sentiment &&
        (sentiment.sentimentScore !== 0 ||
          (sentiment.summary && sentiment.summary.trim().length > 0) ||
          (sentiment.pros && sentiment.pros.length > 0) ||
          (sentiment.cons && sentiment.cons.length > 0));
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
        const reviewToUpsert = { ...reviewForDatabase, sentiment };
        await upsertReviewToSupabase(reviewToUpsert);
      }
      res.json({
        success: true,
        reviewId: review.videoUrl,
        sentiment,
        metadata: {
          gameTitle: review.title,
          creatorName: (review as any).creatorName || '',
          videoTitle: review.title,
          channelTitle: (review as any).channelTitle || (review as any).creatorName || '',
          publishedAt: review.publishedAt,
        },
        transcript: {
          method: review.transcriptMethod,
          cost: review.transcriptCost,
          length: review.transcript ? review.transcript.length : 0,
          error: review.transcriptError,
          debug: review.transcriptDebug,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to process YouTube video',
      });
    }
  },
};
