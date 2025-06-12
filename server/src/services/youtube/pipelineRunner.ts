import {
  fetchMetadataStep,
  extractGameInfoStep,
  fetchTranscriptStep,
  normalizeReviewStep,
  llmAnalysisStep,
  generalAnalysisStep,
} from './pipelineSteps';
import { fetchDemoReviewByVideoUrl, upsertDemoReview } from './captionIngestService';
import { YouTubeVideoMetadata, createSlug } from './youtubeApiService';
import logger from '@/logger';
import crypto from 'crypto';

interface PipelineOptions {
  transcriptOptions?: any;
  llmModel?: string;
  generalAnalysis?: boolean;
}

interface PipelineContext {
  videoId: string;
  metadata?: YouTubeVideoMetadata;
  gameTitle?: string | null;
  gameSlug?: string | null;
  transcriptResult?: any;
  review?: any;
  llmResult?: any;
  generalResult?: any;
  [key: string]: any;
}

export const runYouTubePipeline = async (videoId: string, opts: PipelineOptions = {}) => {
  const context: PipelineContext = { videoId };
  try {
    // 1. Fetch metadata
    const metadata = await fetchMetadataStep({ videoId }, context);
    context.metadata = metadata;
    logger.info('[PIPELINE] Metadata fetched', metadata);

    // 2. Extract game info
    const { gameTitle, gameSlug } = await extractGameInfoStep({ metadata }, context);
    context.metadata = {
      ...context.metadata,
      gameTitle: gameTitle ?? undefined,
      gameSlug: gameSlug ?? undefined,
    };
    logger.info('[PIPELINE] Game info extracted:', { gameTitle, gameSlug });

    // 3. Fetch transcript
    const transcriptResult = await fetchTranscriptStep(
      { videoId, options: opts.transcriptOptions },
      context,
    );
    logger.info('[PIPELINE] Transcript fetched:', transcriptResult.method);

    // --- Deduplication: hash transcript and check DB ---
    const transcript = transcriptResult.transcript;
    const transcriptHash = crypto.createHash('sha256').update(transcript).digest('hex');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cached = await fetchDemoReviewByVideoUrl(videoUrl);
    // TODO: Once transcript_hash is added to demo_reviews, check and skip LLM if unchanged
    // if (cached?.transcript_hash === transcriptHash) {
    //   logger.info('[PIPELINE] Transcript unchanged, skipping LLM analysis. Only updating data if needed.');
    //   // Optionally update data/metadata if needed, but skip LLM
    //   // ...
    //   return { ...cached, skippedLLM: true };
    // }

    // 4. Normalize review
    const review = await normalizeReviewStep(
      {
        videoId,
        transcript: transcriptResult.transcript,
        gameSlug: gameSlug || '',
        creatorSlug: metadata.channelId,
        channelUrl: `https://www.youtube.com/channel/${metadata.channelId}`,
        gameTitle: gameTitle || '',
        creatorName: metadata.channelTitle || '',
        publishedAt: metadata.publishedAt,
      },
      context,
    );
    logger.info('[PIPELINE] Review normalized', review);

    // 5. LLM analysis
    const llmResult = await llmAnalysisStep(
      {
        transcript: transcriptResult.transcript,
        title: metadata.title,
        model: opts.llmModel,
      },
      context,
    );
    logger.info('[PIPELINE] LLM analysis complete');

    // 6. General analysis (optional)
    let generalResult;
    if (opts.generalAnalysis) {
      generalResult = await generalAnalysisStep(
        {
          transcript: transcriptResult.transcript,
          model: opts.llmModel,
        },
        context,
      );
      logger.info('[PIPELINE] General analysis complete');
    }

    // 7. Flatten result to canonical shape (use context fields)
    const fullBiasScoringOutput = {
      sentiment: context.llmResult?.sentiment ?? context.llmResult ?? {},
      biasDetection: context.llmResult?.biasDetection ?? {},
      biasAdjustment: context.llmResult?.biasAdjustment ?? {},
      sentimentSnapshot: context.llmResult?.sentimentSnapshot ?? {},
    };

    // Compose the full response for API
    const response = {
      ...fullBiasScoringOutput,
      metadata: context.metadata,
      transcript: context.transcriptResult?.transcript,
      transcriptMethod: context.transcriptResult?.method,
      transcriptDebug: context.transcriptResult?.debug,
      gameTitle: context.gameTitle,
      gameSlug: context.gameSlug,
      review,
      generalResult,
    };

    // Upsert: only LLM output in data, everything else as separate columns
    const rawSlug = gameSlug || metadata.title || videoId;
    const slug = createSlug(rawSlug);
    await upsertDemoReview(
      videoUrl,
      fullBiasScoringOutput, // ONLY the LLM output in data
      slug,
      transcriptResult.transcript,
      context.metadata,
      // TODO: Add transcriptHash to upsert when DB is updated
    );
    logger.info('[PIPELINE] Upserted to demo_reviews');

    return response;
  } catch (err) {
    logger.error('[PIPELINE] Error:', err);
    throw err;
  }
};

export const runLLMOnlyPipeline = async (videoId: string, opts: PipelineOptions = {}) => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cached = await fetchDemoReviewByVideoUrl(videoUrl);
  if (!cached?.transcript) throw new Error('No cached transcript found for LLM-only pipeline');

  // Only run LLM analysis
  const llmResult = await llmAnalysisStep(
    { transcript: cached.transcript, model: opts.llmModel },
    { videoId },
  );

  const fullBiasScoringOutput = {
    sentiment: llmResult?.sentiment ?? llmResult ?? {},
    biasDetection: llmResult?.biasDetection ?? {},
    biasAdjustment: llmResult?.biasAdjustment ?? {},
    sentimentSnapshot: llmResult?.sentimentSnapshot ?? {},
  };

  // Only upsert the new LLM output to the data column, leave transcript/metadata untouched
  await upsertDemoReview(
    videoUrl,
    fullBiasScoringOutput,
    cached.slug,
    cached.transcript,
    cached.metadata,
  );

  return fullBiasScoringOutput;
};
