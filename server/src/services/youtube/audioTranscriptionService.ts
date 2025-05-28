import YTDlpWrap from 'yt-dlp-wrap';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

export interface TranscriptionOptions {
  maxDurationMinutes?: number; // Default: 30 minutes
  audioQuality?: 'worst' | 'best'; // Default: worst (smaller files)
  tempDir?: string; // Default: /tmp
}

/**
 * Extracts audio from YouTube video and transcribes it using OpenAI Whisper
 */
export const transcribeYouTubeAudio = async (
  videoId: string, 
  options: TranscriptionOptions = {}
): Promise<string> => {
  // Kill switch to prevent OpenAI costs
  if (process.env.DISABLE_OPENAI === 'true') {
    console.log('[AUDIO] OpenAI transcription disabled via DISABLE_OPENAI env var');
    throw new Error('Audio transcription disabled');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!openai.apiKey) {
    throw new Error('OpenAI API key not configured for audio transcription');
  }

  const {
    maxDurationMinutes = 30,
    audioQuality = 'worst',
    tempDir = '/tmp'
  } = options;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);

  try {
    console.log(`[AUDIO] Starting audio extraction for ${videoId}`);
    
    // Initialize yt-dlp
    const ytDlpWrap = new YTDlpWrap();
    
    // Extract audio with duration limit
    await ytDlpWrap.execPromise([
      videoUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', audioQuality,
      '--match-filter', `duration < ${maxDurationMinutes * 60}`, // Duration in seconds
      '--output', audioPath.replace('.mp3', '.%(ext)s'),
      '--no-playlist'
    ]);

    // Check if file was created
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio extraction failed - file not created. Video may be too long (>${maxDurationMinutes}min) or unavailable.`);
    }

    const stats = fs.statSync(audioPath);
    console.log(`[AUDIO] Audio extracted: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

    // Transcribe with OpenAI Whisper
    console.log(`[AUDIO] Starting transcription for ${videoId}`);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'en', // Optimize for English
      response_format: 'text'
    });

    console.log(`[AUDIO] Transcription completed: ${transcription.length} characters`);
    
    // Clean up audio file
    await unlinkAsync(audioPath);
    
    return transcription;

  } catch (error: any) {
    // Clean up audio file if it exists
    try {
      if (fs.existsSync(audioPath)) {
        await unlinkAsync(audioPath);
      }
    } catch (cleanupError) {
      console.warn(`[AUDIO] Failed to clean up ${audioPath}:`, cleanupError);
    }

    // Handle specific errors
    if (error.message?.includes('duration')) {
      throw new Error(`Video ${videoId} is too long (>${maxDurationMinutes} minutes) for audio transcription`);
    }
    if (error.message?.includes('Video unavailable')) {
      throw new Error(`Video ${videoId} is unavailable for audio extraction`);
    }
    if (error.message?.includes('Private video')) {
      throw new Error(`Video ${videoId} is private and cannot be accessed`);
    }
    
    throw new Error(`Audio transcription failed for ${videoId}: ${error.message}`);
  }
};

/**
 * Estimates the cost of transcribing a video based on duration
 * OpenAI Whisper pricing: $0.006 per minute
 */
export const estimateTranscriptionCost = (durationMinutes: number): number => {
  return durationMinutes * 0.006; // $0.006 per minute
};

/**
 * Gets video duration from YouTube without downloading
 */
export const getVideoDuration = async (videoId: string): Promise<number> => {
  const ytDlpWrap = new YTDlpWrap();
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const info = await ytDlpWrap.getVideoInfo(videoUrl);
    return Math.ceil((info.duration || 0) / 60); // Return duration in minutes
  } catch (error: any) {
    throw new Error(`Failed to get video duration: ${error.message}`);
  }
}; 