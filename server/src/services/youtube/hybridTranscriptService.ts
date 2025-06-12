import { fetchYoutubeCaptions } from './captionIngestService';
import * as audioService from './audioTranscriptionService';
import { TranscriptionOptions } from './audioTranscriptionService';
import logger from '@/logger';

export interface HybridTranscriptResult {
  transcript: string;
  method: 'captions' | 'audio' | 'none';
  duration?: number; // in minutes
  cost?: number; // in USD
  error?: string;
  debug?: string[];
}

export interface HybridTranscriptOptions extends TranscriptionOptions {
  allowAudioFallback?: boolean; // Default: true
  maxCostUSD?: number; // Default: 1.00 (max $1 per video)
  language?: string; // Default: 'en'
  forceEnglish?: boolean; // If true, force English output
  emit?: (msg: string) => void; // Progress emitter
}

/**
 * Hybrid transcript service: tries captions first, falls back to audio transcription
 */
export const getHybridTranscript = async (
  videoId: string,
  options: HybridTranscriptOptions = {},
): Promise<HybridTranscriptResult> => {
  const {
    allowAudioFallback = true,
    maxCostUSD = 1.0,
    language = 'en',
    forceEnglish,
    emit,
    ...transcriptionOptions
  } = options;

  const debug: string[] = [];
  const emitStep = (msg: string) => {
    debug.push(msg);
    if (emit) emit(msg);
  };
  debug.push(`[HYBRID] Starting hybrid transcript for ${videoId}`);
  emitStep(`Starting hybrid transcript for ${videoId}`);

  // Step 1: Try captions first (fast and free)
  try {
    debug.push(`[HYBRID] Attempting captions for ${videoId}`);
    emitStep(`Attempting captions for ${videoId}`);
    const transcript = await fetchYoutubeCaptions(videoId, language);

    if (transcript && transcript.trim().length > 0) {
      debug.push(`[HYBRID] ✅ Captions successful: ${transcript.length} characters`);
      emitStep(`✅ Captions successful: ${transcript.length} characters`);
      return {
        transcript,
        method: 'captions',
        cost: 0,
        debug,
      };
    }
  } catch (error: any) {
    logger.error(
      { message: error.message, stack: error.stack, videoId },
      '[HYBRID] Error fetching captions',
    );
    debug.push(`[HYBRID] ❌ Captions failed: ${error.message}`);
    emitStep(`❌ Captions failed: ${error.message}`);
  }

  // Step 2: Fallback to audio transcription (if enabled)
  if (!allowAudioFallback) {
    debug.push(`[HYBRID] Audio fallback disabled, returning empty transcript`);
    emitStep(`Audio fallback disabled, returning empty transcript`);
    return {
      transcript: '',
      method: 'none',
      error: 'No captions available and audio fallback disabled',
      debug,
    };
  }

  try {
    // Check video duration and cost before proceeding
    debug.push(`[HYBRID] Checking video duration for ${videoId}`);
    emitStep(`Checking video duration for ${videoId}`);
    const duration = await audioService.getVideoDuration(videoId);
    const estimatedCost = audioService.estimateTranscriptionCost(duration);

    emitStep(`Video duration: ${duration} minutes, estimated cost: $${estimatedCost.toFixed(3)}`);

    // Cost check
    if (estimatedCost > maxCostUSD) {
      debug.push(`[HYBRID] ❌ Cost too high: $${estimatedCost.toFixed(3)} > $${maxCostUSD}`);
      emitStep(`❌ Cost too high: $${estimatedCost.toFixed(3)} > $${maxCostUSD}`);
      return {
        transcript: '',
        method: 'none',
        duration,
        cost: estimatedCost,
        error: `Video too expensive to transcribe: $${estimatedCost.toFixed(3)} (max: $${maxCostUSD})`,
        debug,
      };
    }

    // Proceed with audio transcription
    debug.push(`[HYBRID] Attempting audio transcription for ${videoId}`);
    emitStep(`Attempting audio transcription for ${videoId}`);
    const transcript = await audioService.transcribeYouTubeAudio(videoId, {
      ...transcriptionOptions,
      language,
      forceEnglish: typeof forceEnglish === 'boolean' ? forceEnglish : language === 'en',
    });
    debug.push(`[HYBRID] ✅ Audio transcription successful: ${transcript.length} characters`);
    emitStep(`✅ Audio transcription successful: ${transcript.length} characters`);
    return {
      transcript,
      method: 'audio',
      duration,
      cost: estimatedCost,
      debug,
    };
  } catch (error: any) {
    logger.error(
      { message: error.message, stack: error.stack, videoId },
      '[HYBRID] Error in audio transcription',
    );
    debug.push(`[HYBRID] ❌ Audio transcription failed: ${error.message}`);
    emitStep(`❌ Audio transcription failed: ${error.message}`);
    return {
      transcript: '',
      method: 'none',
      error: `Both captions and audio transcription failed: ${error.message}`,
      debug,
    };
  }
};

/**
 * Batch processing with cost controls
 */
export const getHybridTranscriptBatch = async (
  videoIds: string[],
  options: HybridTranscriptOptions = {},
): Promise<Record<string, HybridTranscriptResult>> => {
  const results: Record<string, HybridTranscriptResult> = {};
  let totalCost = 0;
  const maxBatchCost = options.maxCostUSD || 10.0; // Default $10 max per batch

  logger.info({ videoIds, maxBatchCost }, '[HYBRID] Starting batch processing for videos');

  for (const videoId of videoIds) {
    if (totalCost >= maxBatchCost) {
      logger.info({ totalCost }, '[HYBRID] Batch cost limit reached');
      results[videoId] = {
        transcript: '',
        method: 'none',
        error: 'Batch cost limit reached',
      };
      continue;
    }

    try {
      const result = await getHybridTranscript(videoId, {
        ...options,
        maxCostUSD: Math.min(options.maxCostUSD || 1.0, maxBatchCost - totalCost),
      });

      results[videoId] = result;
      totalCost += result.cost || 0;

      logger.info({ videoId, result }, '[HYBRID] Video processed');
    } catch (error: any) {
      logger.error(
        { message: error.message, stack: error.stack, videoId },
        '[HYBRID] Error in getHybridTranscriptBatch',
      );
      results[videoId] = {
        transcript: '',
        method: 'none',
        error: error.message,
      };
    }
  }

  logger.info({ totalCost }, '[HYBRID] Batch complete. Total cost');
  return results;
};
