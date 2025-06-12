import { Request, Response } from 'express';
import { normalizeYoutubeToReview } from '@/services/youtube/captionIngestService';
import {
  fetchYouTubeVideoMetadata,
  extractGameFromMetadata,
  createSlug,
} from '@/services/youtube/youtubeApiService';
import { getHybridTranscript } from '@/services/youtube/hybridTranscriptService';
import type { ApiResponse, ReviewAnalysisResponse } from '@scorelytic/shared';
import logger from '@/logger';

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
  metadata?: any;
  biasDetection?: any;
  biasAdjustment?: any;
  sentimentSnapshot?: any;
  culturalContext?: any;
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
      if (demoMode) {
        const pipelineResult =
          await require('@/services/youtube/pipelineRunner').runYouTubePipeline(videoId, {
            transcriptOptions: { language },
            generalAnalysis,
            demoMode: true,
          });
        return res.json({
          success: true,
          data: pipelineResult,
        });
      } else {
        // Modular pipeline
        const pipelineResult =
          await require('@/services/youtube/pipelineRunner').runYouTubePipeline(videoId, {
            transcriptOptions: { language },
            generalAnalysis,
          });
        return res.json({
          success: true,
          data: pipelineResult,
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
      // Run modular pipeline with emit for progress
      const pipelineResult = await require('@/services/youtube/pipelineRunner').runYouTubePipeline(
        videoId,
        {
          transcriptOptions: { language, emit },
          generalAnalysis: generalAnalysisBool,
        },
      );
      sendEvent('result', {
        success: true,
        ...pipelineResult,
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
  logger.info(
    'processYouTubeVideo transcript:',
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
  logger.info(
    'processYouTubeVideo transcript:',
    typeof transcriptResult.transcript,
    transcriptResult.transcript && transcriptResult.transcript.length,
  );
  logger.info(
    'processYouTubeVideo returned transcript:',
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
