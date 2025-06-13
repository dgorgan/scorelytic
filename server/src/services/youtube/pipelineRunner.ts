import {
  fetchMetadataStep,
  extractGameInfoStep,
  fetchTranscriptStep,
  normalizeReviewStep,
  llmAnalysisStep,
} from './pipelineSteps';
import { fetchDemoReviewByVideoUrl, upsertDemoReview } from './captionIngestService';
import { YouTubeVideoMetadata, createSlug } from './youtubeApiService';
import logger from '@/logger';
import crypto from 'crypto';

interface PipelineOptions {
  transcriptOptions?: any;
  llmModel?: string;
}

interface PipelineContext {
  videoId: string;
  metadata?: YouTubeVideoMetadata;
  gameTitle?: string | null;
  gameSlug?: string | null;
  transcriptResult?: any;
  review?: any;
  llmResult?: any;
  [key: string]: any;
}

export const runYouTubePipeline = async (videoId: string, opts: PipelineOptions = {}) => {
  const context: PipelineContext = { videoId };
  logger.info(opts, '[PIPELINE] Pipeline options');
  try {
    logger.info({ videoId }, '[PIPELINE] Starting runYouTubePipeline pipeline');
    // 1. Fetch metadata
    try {
      const metadata = await fetchMetadataStep({ videoId }, context);
      context.metadata = metadata;
      logger.info({ metadata }, '[PIPELINE] Metadata fetched');
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in fetchMetadataStep',
      );
      throw err;
    }
    // 2. Extract game info
    try {
      const { gameTitle, gameSlug } = await extractGameInfoStep(
        { metadata: context.metadata },
        context,
      );
      logger.info({ gameTitle, gameSlug }, '[PIPELINE] Game info extracted:');
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in extractGameInfoStep',
      );
      throw err;
    }
    // 3. Fetch transcript
    let transcriptResult;
    try {
      transcriptResult = await fetchTranscriptStep(
        { videoId, options: opts.transcriptOptions },
        context,
      );
      logger.info({ method: transcriptResult.method }, '[PIPELINE] Transcript fetched:');
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in fetchTranscriptStep',
      );
      throw err;
    }
    // --- Deduplication: hash transcript and check DB ---
    const transcript = transcriptResult.transcript;
    const transcriptHash = crypto.createHash('sha256').update(transcript).digest('hex');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let cached;
    try {
      cached = await fetchDemoReviewByVideoUrl(videoUrl);
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in fetchDemoReviewByVideoUrl',
      );
      throw err;
    }
    logger.info({ cached }, '[PIPELINE] Transcript ready (cached or fresh), running LLM analysis.');
    // 4. Normalize review
    let review;
    try {
      review = await normalizeReviewStep(
        {
          videoId,
          transcript: transcriptResult.transcript,
          gameSlug: context.metadata.gameSlug || '',
          creatorSlug: context.metadata.channelId,
          channelUrl: `https://www.youtube.com/channel/${context.metadata.channelId}`,
          gameTitle: context.metadata.gameTitle || '',
          creatorName: context.metadata.channelTitle || '',
          publishedAt: context.metadata.publishedAt,
        },
        context,
      );
      logger.info({ review }, '[PIPELINE] Review normalized');
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in normalizeReviewStep',
      );
      throw err;
    }
    // 5. LLM analysis
    let llmResult;
    try {
      llmResult = await llmAnalysisStep(
        {
          transcript: transcriptResult.transcript,
          title: context.metadata.title,
          model: opts.llmModel,
        },
        context,
      );
      logger.info('[PIPELINE] LLM analysis complete');
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error in llmAnalysisStep',
      );
      throw err;
    }
    // 6. Flatten result to canonical shape (use context fields)
    const fullBiasScoringOutput = {
      sentiment: {
        ...(context.llmResult?.sentiment ?? context.llmResult ?? {}),
        biasDetection: context.llmResult?.biasDetection ?? {},
        biasAdjustment: context.llmResult?.biasAdjustment ?? {},
        sentimentSnapshot: context.llmResult?.sentimentSnapshot ?? {},
        ...(context.llmResult?.biasDetection?.noBiasExplanation
          ? { noBiasExplanation: context.llmResult.biasDetection.noBiasExplanation }
          : {}),
      },
    };
    // Upsert: only LLM output in data
    try {
      await upsertDemoReview(
        videoUrl,
        fullBiasScoringOutput, // ONLY the LLM output in data
        cached?.slug || createSlug(context.metadata?.title || videoId),
        transcriptResult.transcript,
        context.metadata,
        transcriptHash,
      );
      logger.info('[PIPELINE] Upserted to demo_reviews');
    } catch (err: any) {
      logger.error(
        {
          message: err.message,
          stack: err.stack,
          videoId,
          slug: cached?.slug || createSlug(context.metadata?.title || videoId),
          transcriptHash,
        },
        '[PIPELINE] Error in upsertDemoReview',
      );
      throw err;
    }
    // Fetch and return the full upserted row
    let upserted;
    try {
      upserted = await fetchDemoReviewByVideoUrl(videoUrl);
    } catch (err: any) {
      logger.error(
        { message: err.message, stack: err.stack, videoId },
        '[PIPELINE] Error fetching upserted row after upsert',
      );
      throw err;
    }
    if (!upserted) return null;
    return {
      data: upserted.data,
      slug: upserted.slug,
      transcript_hash: upserted.transcript_hash,
      metadata: upserted.metadata,
      transcript: upserted.transcript,
    };
  } catch (err: any) {
    logger.error(
      { message: err.message, stack: err.stack, videoId },
      '[PIPELINE] Error in runYouTubePipeline',
    );
    throw err;
  }
};

export const runLLMOnlyPipeline = async (videoId: string, opts: PipelineOptions = {}) => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let cached;
  logger.info({ videoId }, '[PIPELINE] Running LLM-only pipeline');
  try {
    cached = await fetchDemoReviewByVideoUrl(videoUrl);
  } catch (err: any) {
    logger.error(
      { message: err.message, stack: err.stack, videoId },
      '[PIPELINE] Error in fetchDemoReviewByVideoUrl (LLM-only)',
    );
    throw err;
  }
  if (!cached?.transcript) {
    logger.error({ videoId }, '[PIPELINE] No cached transcript found for LLM-only pipeline');
    throw new Error('No cached transcript found for LLM-only pipeline');
  }
  let llmResult;
  try {
    llmResult = await llmAnalysisStep(
      { transcript: cached.transcript, model: opts.llmModel },
      { videoId },
    );
  } catch (err: any) {
    logger.error(
      { message: err.message, stack: err.stack, videoId },
      '[PIPELINE] Error in llmAnalysisStep (LLM-only)',
    );
    throw err;
  }
  const fullBiasScoringOutput = {
    sentiment: {
      ...(llmResult?.sentiment ?? llmResult ?? {}),
      biasDetection: llmResult?.biasDetection ?? {},
      biasAdjustment: llmResult?.biasAdjustment ?? {},
      sentimentSnapshot: llmResult?.sentimentSnapshot ?? {},
    },
  };
  try {
    await upsertDemoReview(
      videoUrl,
      fullBiasScoringOutput,
      cached?.slug || createSlug(cached?.metadata?.title || videoId),
      cached.transcript,
      cached.metadata,
    );
  } catch (err: any) {
    logger.error(
      {
        message: err.message,
        stack: err.stack,
        videoId,
        slug: cached?.slug || createSlug(cached?.metadata?.title || videoId),
      },
      '[PIPELINE] Error in upsertDemoReview (LLM-only)',
    );
    throw err;
  }
  return fullBiasScoringOutput;
};
