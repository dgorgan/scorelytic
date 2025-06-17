import { Request, Response } from 'express';
import { fetchYouTubeVideoMetadata } from '@/services/youtube/youtubeApiService';
import type { ApiResponse, ReviewAnalysisResponse } from '@scorelytic/shared';
import { generalAnalysisStep } from '@/services/youtube/generalAnalysisStep';

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
    legacyAndInfluence: obj.legacyAndInfluence ?? obj.cultural_context ?? {},
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
  legacyAndInfluence?: any;
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
        demoMode = false,
      } = req.body as {
        videoId?: string;
        language?: string;
        demoMode?: boolean;
      };
      if (!videoId) {
        return res.status(400).json({ success: false, error: 'videoId is required' });
      }
      if (demoMode) {
        const pipelineResult =
          await require('@/services/youtube/pipelineRunner').runYouTubePipeline(videoId, {
            transcriptOptions: { language },
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
      const { videoId, language = 'en' } = req.query as {
        videoId?: string;
        language?: string;
      };
      if (!videoId) {
        sendEvent('error', { error: 'videoId is required' });
        res.end();
        return;
      }
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

  generalAnalysisHandler: async (req: Request, res: Response) => {
    const { videoId, language = 'en' } = req.query as { videoId?: string; language?: string };
    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId' });
    }
    try {
      // Fetch transcript (captions/audio)
      const transcriptResult =
        await require('@/services/youtube/pipelineSteps').fetchTranscriptStep(
          { videoId, options: { language } },
          {},
        );
      if (!transcriptResult.transcript || !transcriptResult.transcript.trim()) {
        throw new Error('Transcript not found');
      }
      // Run general analysis
      const generalResult = await generalAnalysisStep(
        { transcript: transcriptResult.transcript },
        {},
      );
      return res.json({ generalResult });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  youtubeMetadataHandler: async (req: Request, res: Response) => {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    try {
      const metadata: YoutubeMeta = await fetchYouTubeVideoMetadata(videoId);
      res.json(metadata);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch YouTube metadata' });
    }
  },
};
