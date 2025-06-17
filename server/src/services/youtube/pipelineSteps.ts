import {
  fetchYouTubeVideoMetadata,
  extractGameFromMetadata,
  createSlug,
  YouTubeVideoMetadata,
} from './youtubeApiService';
import { getHybridTranscript, HybridTranscriptResult } from './hybridTranscriptService';
import { normalizeYoutubeToReview } from './captionIngestService';
import {
  analyzeTextWithBiasAdjustmentFull,
  analyzeGeneralSummary,
} from '@/services/sentiment/sentimentService';
import logger from '@/logger';

interface PipelineContext {
  videoId: string;
  [key: string]: any;
}

export const fetchMetadataStep = async (input: { videoId: string }, context: PipelineContext) => {
  try {
    const metadata = await fetchYouTubeVideoMetadata(input.videoId);
    context.metadata = metadata;
    logger.info({ metadata }, '[PIPELINE] Metadata fetched');
    return metadata;
  } catch (err: any) {
    const errorObj = err as any;
    logger.error(
      { message: errorObj.message, stack: errorObj.stack, videoId: input.videoId },
      '[PIPELINE] Error in fetchMetadataStep',
    );
    throw err;
  }
};

export const extractGameInfoStep = async (
  input: { metadata: YouTubeVideoMetadata },
  context: PipelineContext,
) => {
  try {
    const gameTitle = extractGameFromMetadata(input.metadata);
    const gameSlug = gameTitle ? createSlug(gameTitle) : null;
    context.gameTitle = gameTitle;
    context.gameSlug = gameSlug;
    return { gameTitle, gameSlug };
  } catch (err: any) {
    const errorObj = err as any;
    logger.error('[PIPELINE] Error in extractGameInfoStep', {
      message: errorObj.message,
      stack: errorObj.stack,
    });
    throw err;
  }
};

export const fetchTranscriptStep = async (
  input: { videoId: string; options?: any },
  context: PipelineContext,
) => {
  try {
    const transcriptResult: HybridTranscriptResult = await getHybridTranscript(
      input.videoId,
      input.options || {},
    );
    context.transcriptResult = transcriptResult;
    return transcriptResult;
  } catch (err: any) {
    const errorObj = err as any;
    logger.error('[PIPELINE] Error in fetchTranscriptStep', {
      message: errorObj.message,
      stack: errorObj.stack,
      videoId: input.videoId,
    });
    throw err;
  }
};

export const normalizeReviewStep = async (
  input: {
    videoId: string;
    transcript: string;
    gameSlug: string;
    creatorSlug: string;
    channelUrl?: string;
    gameTitle?: string;
    creatorName?: string;
    publishedAt?: string;
  },
  context: PipelineContext,
) => {
  try {
    const review = await normalizeYoutubeToReview(input);
    context.review = review;
    return review;
  } catch (err: any) {
    const errorObj = err as any;
    logger.error('[PIPELINE] Error in normalizeReviewStep', {
      message: errorObj.message,
      stack: errorObj.stack,
      videoId: input.videoId,
    });
    throw err;
  }
};

export const llmAnalysisStep = async (
  input: { transcript: string; title?: string; creatorName?: string; model?: string },
  context: PipelineContext,
) => {
  try {
    if (!input.transcript || !input.transcript.trim()) {
      context.llmResult = undefined;
      return undefined;
    }
    const llmResult = await analyzeTextWithBiasAdjustmentFull(
      input.transcript,
      input.model || 'gpt-4o',
      undefined,
      input.title,
      input.creatorName,
    );
    context.llmResult = llmResult;
    return llmResult;
  } catch (err: any) {
    const errorObj = err as any;
    logger.error('[PIPELINE] Error in llmAnalysisStep', {
      message: errorObj.message,
      stack: errorObj.stack,
    });
    throw err;
  }
};
