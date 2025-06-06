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
import { analyzeTextWithBiasAdjustmentFull, analyzeGeneralSummary } from '@/services/sentiment';
import { supabase } from '@/config/database';
import type {
  Review,
  SentimentAnalysisResponse,
  ApiResponse,
  ReviewAnalysisResponse,
} from '@scorelytic/shared';
import { Router } from 'express';

const flattenSentiment = (
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  if (!obj) return {};
  if (obj.sentiment && typeof obj.sentiment === 'object') {
    return {
      ...(obj.sentiment as Record<string, unknown>),
      ...Object.fromEntries(Object.entries(obj).filter(([k]) => k !== 'sentiment')),
    };
  }
  return obj;
};

const normalizeSentiment = (obj: any) => {
  const score = obj.sentimentScore ?? obj.sentiment_score ?? obj.score ?? 0;
  const biasDetection = obj.biasDetection ?? obj.bias_detection ?? {};
  const biasAdjustment = obj.biasAdjustment ?? obj.bias_adjustment ?? {};
  const biasAdjustedScore =
    typeof biasAdjustment.biasAdjustedScore === 'number' && !isNaN(biasAdjustment.biasAdjustedScore)
      ? biasAdjustment.biasAdjustedScore
      : (biasDetection.originalScore ?? score);
  return {
    score,
    sentimentScore: score,
    summary: obj.summary || '',
    verdict: obj.verdict || '',
    sentimentSummary: obj.sentimentSummary ?? obj.sentiment_summary ?? '',
    biasIndicators: obj.biasIndicators ?? obj.bias_indicators ?? [],
    alsoRecommends: obj.alsoRecommends ?? obj.also_recommends ?? [],
    pros: obj.pros || [],
    cons: obj.cons || [],
    reviewSummary: obj.reviewSummary ?? obj.review_summary ?? '',
    biasDetection,
    biasAdjustment: {
      biasAdjustedScore,
      totalScoreAdjustment: biasAdjustment.totalScoreAdjustment ?? 0,
      rationale: biasAdjustment.rationale ?? '',
    },
    sentimentSnapshot: obj.sentimentSnapshot ?? obj.sentiment_snapshot ?? {},
    culturalContext: obj.culturalContext ?? obj.cultural_context ?? {},
  };
};

const processYouTubeVideo = async (videoId: string, language: string = 'en') => {
  const metadata = await fetchYouTubeVideoMetadata(videoId);
  const extractedGameTitle = extractGameFromMetadata(metadata);
  const gameSlug = extractedGameTitle ? createSlug(extractedGameTitle) : 'unknown-game';
  const creatorSlug = createSlug(metadata.channelTitle);
  const transcriptResult = await getHybridTranscript(videoId, {
    allowAudioFallback: true,
    maxCostUSD: 0.5,
    maxDurationMinutes: 20,
    language,
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
    _youtubeMeta: metadata,
  };
};

interface ProgressEvent {
  message: string;
}

interface ResultEvent {
  success: boolean;
  sentiment?: ReturnType<typeof normalizeSentiment>;
  summary?: string;
  keyNotes?: string[];
  transcript?: string;
  debug: string[];
}

interface ErrorEvent {
  error: string;
}

type ProgressEmitter = (msg: string) => void;

interface YoutubeMeta {
  title?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  description?: string;
  thumbnails?: any;
  tags?: string[];
}

export const youtubeController = {
  processVideo: async (
    req: Request,
    res: Response<ApiResponse<ReviewAnalysisResponse> | ApiResponse<any>>,
  ) => {
    try {
      const {
        videoId,
        language = 'en',
        generalAnalysis = false,
        demoMode = false,
      } = req.body as {
        videoId?: string;
        language?: string;
        generalAnalysis?: boolean;
        demoMode?: boolean;
      };
      if (!videoId) {
        return res.status(400).json({ success: false, error: 'videoId is required' });
      }
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      if (demoMode) {
        const debugLog: string[] = [];
        const emit: ProgressEmitter = (msg) => debugLog.push(msg);
        const review = await processYouTubeVideoWithProgress(videoId, language, emit);
        let sentiment: ReturnType<typeof normalizeSentiment> | undefined;
        if (review.transcript && review.transcript.trim().length > 0) {
          if (generalAnalysis) {
            emit('Running general analysis...');
            const generalResult = await analyzeGeneralSummary(review.transcript!, 'gpt-4o');
            const llmDebug =
              'LLM generalAnalysis result (raw): ' + JSON.stringify(generalResult, null, 2);
            debugLog.push(llmDebug);
            const minimal = {
              reviewId: videoUrl,
              sentiment: undefined,
              metadata: {
                title: review.title,
                channelTitle: (review as any)['creatorName'] || '',
                channelId: (review as any)['channelId'] || '',
                publishedAt: review.publishedAt,
                videoTitle: review.title,
                channelUrl:
                  (review as any)['channelUrl'] ||
                  ((review as any)['channelId']
                    ? `https://www.youtube.com/channel/${(review as any)['channelId']}`
                    : ''),
                thumbnails: review.thumbnails,
                tags: review.tags,
                description: review.description,
              },
              transcriptMethod: review.transcriptMethod,
              transcriptDebug: review.transcriptDebug,
              debug: debugLog,
            };
            await supabase.from('demo_reviews').upsert(
              [
                {
                  video_url: videoUrl,
                  data: minimal,
                },
              ],
              { onConflict: 'video_url' },
            );
            return res.json({
              success: true,
              data: {
                summary: generalResult.summary,
                keyNotes: generalResult.keyNotes,
                transcript: review.transcript,
                debug: debugLog,
                metadata: {
                  gameTitle: review.title,
                  creatorName: (review as any)['creatorName'] || '',
                  publishedAt: review.publishedAt,
                  videoTitle: review.title,
                  channelTitle: (review as any)['creatorName'] || '',
                  channelUrl:
                    (review as any)['channelUrl'] ||
                    ((review as any)['channelId']
                      ? `https://www.youtube.com/channel/${(review as any)['channelId']}`
                      : ''),
                  thumbnails: review.thumbnails,
                  tags: review.tags,
                  transcript: review.transcript,
                },
              },
            });
          } else {
            emit('Running bias/sentiment analysis...');
            const llmResult = await analyzeTextWithBiasAdjustmentFull(
              review.transcript!,
              'gpt-4o',
              undefined,
              undefined,
              review.title,
              review.title,
            );
            sentiment = normalizeSentiment(flattenSentiment(llmResult));
          }
        } else {
          emit('No transcript found.');
          sentiment = normalizeSentiment(flattenSentiment({}));
        }
        const minimal = {
          reviewId: videoUrl,
          sentiment,
          metadata: {
            title: review.title,
            channelTitle: review._youtubeMeta?.channelTitle || '',
            channelId: review._youtubeMeta?.channelId || '',
            publishedAt: review.publishedAt,
            description: review.description,
            thumbnails: review.thumbnails,
            tags: review.tags,
          },
          transcriptMethod: review.transcriptMethod,
          transcriptDebug: review.transcriptDebug,
          debug: debugLog,
        };
        await supabase.from('demo_reviews').upsert(
          [
            {
              video_url: videoUrl,
              data: minimal,
            },
          ],
          { onConflict: 'video_url' },
        );
        return res.json({
          success: true,
          data: {
            reviewId: review.videoUrl,
            sentiment,
            metadata: {
              title: review.title,
              channelTitle: review._youtubeMeta?.channelTitle || '',
              channelId: review._youtubeMeta?.channelId || '',
              publishedAt: review.publishedAt,
              description: review.description,
              thumbnails: review.thumbnails,
              tags: review.tags,
              transcript: review.transcript,
            },
            transcript: review.transcript,
            transcriptMethod: review.transcriptMethod,
            transcriptDebug: review.transcriptDebug,
            transcriptError: review.transcriptError,
            debug: debugLog,
          },
        });
      } else {
        const review = await processYouTubeVideo(videoId, language);
        let sentiment: SentimentAnalysisResponse['sentiment'];
        let debugArr = review.transcriptDebug || [];
        // Use YouTube metadata for all fields if available
        const meta = (review._youtubeMeta || {}) as YoutubeMeta;
        const metadataObj = {
          title: meta.title || '',
          channelTitle: meta.channelTitle || '',
          channelId: meta.channelId || '',
          publishedAt: meta.publishedAt || '',
          description: meta.description || '',
          thumbnails: meta.thumbnails || {},
          tags: meta.tags || [],
          channelUrl: meta.channelId ? `https://www.youtube.com/channel/${meta.channelId}` : '',
          transcript: review.transcript,
        };
        if (review.transcript && review.transcript.trim().length > 0) {
          if (generalAnalysis) {
            const generalResult = await analyzeGeneralSummary(review.transcript!, 'gpt-4o');
            // Debug: log and include raw LLM output
            const llmDebug =
              'LLM generalAnalysis result (raw): ' + JSON.stringify(generalResult, null, 2);
            debugArr = [...debugArr, llmDebug];
            return res.json({
              success: true,
              data: {
                summary: generalResult.summary,
                keyNotes: generalResult.keyNotes,
                transcript: review.transcript,
                debug: debugArr,
                metadata: metadataObj,
              },
            });
          } else {
            const llmResult = await analyzeTextWithBiasAdjustmentFull(
              review.transcript!,
              'gpt-4o',
              undefined,
              undefined,
              review.title,
              review.title,
            );
            sentiment = normalizeSentiment(flattenSentiment(llmResult));
          }
        } else {
          sentiment = normalizeSentiment(flattenSentiment({}));
        }
        const isValidSentiment =
          sentiment &&
          ((sentiment.score !== 0 && sentiment.score !== undefined) ||
            ('sentimentScore' in sentiment &&
              sentiment.sentimentScore !== 0 &&
              sentiment.sentimentScore !== undefined) ||
            (sentiment.summary && sentiment.summary.trim().length > 0) ||
            (sentiment.pros && sentiment.pros.length > 0) ||
            (sentiment.cons && sentiment.cons.length > 0));
        if (review.transcript && review.transcript.trim().length > 0 && isValidSentiment) {
          const {
            title,
            description,
            thumbnails,
            tags,
            publishedAt,
            transcriptDebug,
            transcriptError,
            transcriptMethod,
            ...reviewForDatabase
          } = review;
          const reviewToUpsert = { ...reviewForDatabase, sentiment } as Review;
          await upsertReviewToSupabase(reviewToUpsert);
        }
        const freshMeta = await fetchYouTubeVideoMetadata(videoId);
        return res.json({
          success: true,
          data: {
            reviewId: review.videoUrl,
            sentiment,
            // metadata: metadataObj,
            metadata: freshMeta,
            transcript: review.transcript,
            transcriptMethod: review.transcriptMethod,
            transcriptDebug: review.transcriptDebug,
            transcriptError: review.transcriptError,
            debug: debugArr,
          },
        });
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: error.message || 'Failed to process YouTube video' });
    }
  },

  processVideoStream: async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: ProgressEvent | ResultEvent | ErrorEvent): void => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const {
        videoId,
        language = 'en',
        generalAnalysis = false,
      } = req.query as {
        videoId?: string;
        language?: string;
        generalAnalysis?: string | boolean;
      };
      if (!videoId) {
        sendEvent('error', { error: 'videoId is required' });
        res.end();
        return;
      }
      const generalAnalysisBool =
        typeof generalAnalysis === 'string' ? generalAnalysis === 'true' : !!generalAnalysis;
      const debugLog: string[] = [];
      const emit: ProgressEmitter = (msg) => {
        debugLog.push(msg);
        sendEvent('progress', { message: msg });
      };
      const review = await processYouTubeVideoWithProgress(videoId, language, emit);
      let sentiment: ReturnType<typeof normalizeSentiment> | undefined;
      if (review.transcript && review.transcript.trim().length > 0) {
        if (generalAnalysisBool) {
          emit('Running general analysis...');
          const generalResult = await analyzeGeneralSummary(review.transcript!, 'gpt-4o');
          const llmDebug =
            'LLM generalAnalysis result (raw): ' + JSON.stringify(generalResult, null, 2);
          debugLog.push(llmDebug);
          sendEvent('result', {
            success: true,
            summary: generalResult.summary,
            keyNotes: generalResult.keyNotes,
            transcript: review.transcript,
            debug: debugLog,
            metadata: {
              gameTitle: review.title,
              creatorName: (review as any)['creatorName'] || '',
              publishedAt: review.publishedAt,
              videoTitle: review.title,
              channelTitle: (review as any)['creatorName'] || '',
              channelUrl:
                (review as any)['channelUrl'] ||
                ((review as any)['channelId']
                  ? `https://www.youtube.com/channel/${(review as any)['channelId']}`
                  : ''),
              thumbnails: review.thumbnails,
              tags: review.tags,
              transcript: review.transcript,
            },
          } as any);
          res.end();
          return;
        } else {
          emit('Running bias/sentiment analysis...');
          const llmResult = await analyzeTextWithBiasAdjustmentFull(
            review.transcript!,
            'gpt-4o',
            undefined,
            undefined,
            review.title,
            review.title,
          );
          sentiment = normalizeSentiment(flattenSentiment(llmResult));
        }
      } else {
        emit('No transcript found.');
        sentiment = normalizeSentiment(flattenSentiment({}));
      }
      sendEvent('result', {
        success: true,
        sentiment,
        transcript: review.transcript,
        debug: debugLog,
      });
      res.end();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to process YouTube video';
      sendEvent('error', { error: errMsg });
      res.end();
    }
  },
};

async function processYouTubeVideoWithProgress(
  videoId: string,
  language: string = 'en',
  emit: ProgressEmitter = (_msg) => {},
): Promise<ReturnType<typeof processYouTubeVideo>> {
  emit('Fetching metadata...');
  const metadata = await fetchYouTubeVideoMetadata(videoId);
  emit('Extracting game/channel info...');
  const extractedGameTitle = extractGameFromMetadata(metadata);
  const gameSlug = extractedGameTitle ? createSlug(extractedGameTitle) : 'unknown-game';
  const creatorSlug = createSlug(metadata.channelTitle);
  emit('Getting transcript (captions/audio)...');
  const transcriptResult = await getHybridTranscript(videoId, {
    allowAudioFallback: true,
    maxCostUSD: 0.5,
    maxDurationMinutes: 60,
    language,
    emit,
  });
  console.log(
    'DEBUG: processYouTubeVideo transcript:',
    typeof transcriptResult.transcript,
    transcriptResult.transcript && transcriptResult.transcript.length,
  );
  emit('Normalizing review...');
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
  console.log(
    'DEBUG: processYouTubeVideo transcript:',
    typeof transcriptResult.transcript,
    transcriptResult.transcript && transcriptResult.transcript.length,
  );
  console.log(
    'DEBUG: processYouTubeVideo returned transcript:',
    typeof review.transcript,
    review.transcript && review.transcript.length,
  );
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
    _youtubeMeta: metadata,
  };
}

export const youtubeMetadataHandler = async (req: Request, res: Response) => {
  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }
  try {
    const metadata = await fetchYouTubeVideoMetadata(videoId);
    res.json(metadata);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch YouTube metadata' });
  }
};
