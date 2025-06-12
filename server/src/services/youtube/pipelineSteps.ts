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

interface PipelineContext {
  videoId: string;
  [key: string]: any;
}

export const fetchMetadataStep = async (input: { videoId: string }, context: PipelineContext) => {
  const metadata = await fetchYouTubeVideoMetadata(input.videoId);
  context.metadata = metadata;
  return metadata;
};

export const extractGameInfoStep = async (
  input: { metadata: YouTubeVideoMetadata },
  context: PipelineContext,
) => {
  const gameTitle = extractGameFromMetadata(input.metadata);
  const gameSlug = gameTitle ? createSlug(gameTitle) : null;
  context.gameTitle = gameTitle;
  context.gameSlug = gameSlug;
  return { gameTitle, gameSlug };
};

export const fetchTranscriptStep = async (
  input: { videoId: string; options?: any },
  context: PipelineContext,
) => {
  const transcriptResult: HybridTranscriptResult = await getHybridTranscript(
    input.videoId,
    input.options || {},
  );
  context.transcriptResult = transcriptResult;
  return transcriptResult;
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
  const review = await normalizeYoutubeToReview(input);
  context.review = review;
  return review;
};

export const llmAnalysisStep = async (
  input: { transcript: string; title?: string; model?: string },
  context: PipelineContext,
) => {
  if (!input.transcript || !input.transcript.trim()) {
    context.llmResult = undefined;
    return undefined;
  }
  const llmResult = await analyzeTextWithBiasAdjustmentFull(
    input.transcript,
    input.model || 'o3-pro',
    undefined,
    undefined,
    input.title,
  );
  context.llmResult = llmResult;
  return llmResult;
};

export const generalAnalysisStep = async (
  input: { transcript: string; model?: string },
  context: PipelineContext,
) => {
  if (!input.transcript || !input.transcript.trim()) {
    context.generalResult = undefined;
    return undefined;
  }
  const generalResult = await analyzeGeneralSummary(input.transcript, input.model || 'o3-pro');
  context.generalResult = generalResult;
  return generalResult;
};
