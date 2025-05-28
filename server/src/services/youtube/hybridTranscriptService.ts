import { fetchYoutubeCaptions } from './captionIngestService';
import { transcribeYouTubeAudio, getVideoDuration, estimateTranscriptionCost, TranscriptionOptions } from './audioTranscriptionService';

export interface HybridTranscriptResult {
  transcript: string;
  method: 'captions' | 'audio' | 'none';
  duration?: number; // in minutes
  cost?: number; // in USD
  error?: string;
}

export interface HybridTranscriptOptions extends TranscriptionOptions {
  allowAudioFallback?: boolean; // Default: true
  maxCostUSD?: number; // Default: 1.00 (max $1 per video)
}

/**
 * Hybrid transcript service: tries captions first, falls back to audio transcription
 */
export const getHybridTranscript = async (
  videoId: string,
  options: HybridTranscriptOptions = {}
): Promise<HybridTranscriptResult> => {
  const {
    allowAudioFallback = true,
    maxCostUSD = 1.00,
    ...transcriptionOptions
  } = options;

  console.log(`[HYBRID] Starting hybrid transcript for ${videoId}`);

  // Step 1: Try captions first (fast and free)
  try {
    console.log(`[HYBRID] Attempting captions for ${videoId}`);
    const transcript = await fetchYoutubeCaptions(videoId);
    
    if (transcript && transcript.trim().length > 0) {
      console.log(`[HYBRID] ✅ Captions successful: ${transcript.length} characters`);
      return {
        transcript,
        method: 'captions',
        cost: 0
      };
    }
  } catch (error: any) {
    console.log(`[HYBRID] ❌ Captions failed: ${error.message}`);
  }

  // Step 2: Fallback to audio transcription (if enabled)
  if (!allowAudioFallback) {
    console.log(`[HYBRID] Audio fallback disabled, returning empty transcript`);
    return {
      transcript: '',
      method: 'none',
      error: 'No captions available and audio fallback disabled'
    };
  }

  try {
    // Check video duration and cost before proceeding
    console.log(`[HYBRID] Checking video duration for ${videoId}`);
    const duration = await getVideoDuration(videoId);
    const estimatedCost = estimateTranscriptionCost(duration);

    console.log(`[HYBRID] Video duration: ${duration} minutes, estimated cost: $${estimatedCost.toFixed(3)}`);

    // Cost check
    if (estimatedCost > maxCostUSD) {
      console.log(`[HYBRID] ❌ Cost too high: $${estimatedCost.toFixed(3)} > $${maxCostUSD}`);
      return {
        transcript: '',
        method: 'none',
        duration,
        cost: estimatedCost,
        error: `Video too expensive to transcribe: $${estimatedCost.toFixed(3)} (max: $${maxCostUSD})`
      };
    }

    // Proceed with audio transcription
    console.log(`[HYBRID] Attempting audio transcription for ${videoId}`);
    const transcript = await transcribeYouTubeAudio(videoId, transcriptionOptions);
    
    console.log(`[HYBRID] ✅ Audio transcription successful: ${transcript.length} characters`);
    return {
      transcript,
      method: 'audio',
      duration,
      cost: estimatedCost
    };

  } catch (error: any) {
    console.log(`[HYBRID] ❌ Audio transcription failed: ${error.message}`);
    return {
      transcript: '',
      method: 'none',
      error: `Both captions and audio transcription failed: ${error.message}`
    };
  }
};

/**
 * Batch processing with cost controls
 */
export const getHybridTranscriptBatch = async (
  videoIds: string[],
  options: HybridTranscriptOptions = {}
): Promise<Record<string, HybridTranscriptResult>> => {
  const results: Record<string, HybridTranscriptResult> = {};
  let totalCost = 0;
  const maxBatchCost = options.maxCostUSD || 10.00; // Default $10 max per batch

  console.log(`[HYBRID] Starting batch processing for ${videoIds.length} videos (max cost: $${maxBatchCost})`);

  for (const videoId of videoIds) {
    if (totalCost >= maxBatchCost) {
      console.log(`[HYBRID] Batch cost limit reached: $${totalCost.toFixed(3)}`);
      results[videoId] = {
        transcript: '',
        method: 'none',
        error: 'Batch cost limit reached'
      };
      continue;
    }

    try {
      const result = await getHybridTranscript(videoId, {
        ...options,
        maxCostUSD: Math.min(options.maxCostUSD || 1.00, maxBatchCost - totalCost)
      });
      
      results[videoId] = result;
      totalCost += result.cost || 0;
      
      console.log(`[HYBRID] ${videoId}: ${result.method} (cost: $${(result.cost || 0).toFixed(3)}, total: $${totalCost.toFixed(3)})`);
      
    } catch (error: any) {
      results[videoId] = {
        transcript: '',
        method: 'none',
        error: error.message
      };
    }
  }

  console.log(`[HYBRID] Batch complete. Total cost: $${totalCost.toFixed(3)}`);
  return results;
}; 