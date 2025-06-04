import YTDlpWrap from 'yt-dlp-wrap';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { env } from '@/config/env';

const unlinkAsync = promisify(fs.unlink);

export interface TranscriptionOptions {
  maxDurationMinutes?: number; // Default: 30 minutes
  audioQuality?: 'worst' | 'best'; // Default: worst (smaller files)
  tempDir?: string; // Default: /tmp
  language?: string; // Default: 'en'
  forceEnglish?: boolean; // If true, use translation endpoint
}

export interface TranscriptionHelpers {
  downloadAudio: (videoUrl: string, audioPath: string, options: any) => Promise<void>;
  transcribeAudioWithOpenAI: (
    audioPath: string,
    language: string,
    forceEnglish?: boolean,
  ) => Promise<string>;
  getVideoDuration: (videoId: string) => Promise<number>;
  fileExists: (filePath: string) => boolean;
  unlinkFile: (filePath: string) => Promise<void>;
  createReadStream: (filePath: string) => fs.ReadStream;
  getOpenAI: () => OpenAI;
}

const defaultHelpers: TranscriptionHelpers = {
  downloadAudio: async (videoUrl, audioPath, { maxDurationMinutes, audioQuality }) => {
    const ytDlpWrap = new YTDlpWrap();
    await ytDlpWrap.execPromise([
      videoUrl,
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      audioQuality,
      '--match-filter',
      `duration < ${maxDurationMinutes * 60}`,
      '--output',
      audioPath.replace('.mp3', '.%(ext)s'),
      '--no-playlist',
    ]);
  },
  transcribeAudioWithOpenAI: async (audioPath, language) => {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language,
      response_format: 'text',
    });
    return transcription;
  },
  getVideoDuration: async (videoId) => {
    const ytDlpWrap = new YTDlpWrap();
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytDlpWrap.getVideoInfo(videoUrl);
    return Math.ceil((info.duration || 0) / 60);
  },
  fileExists: (filePath) => fs.existsSync(filePath),
  unlinkFile: (filePath) => unlinkAsync(filePath),
  createReadStream: (filePath) => fs.createReadStream(filePath),
  getOpenAI: () => new OpenAI({ apiKey: env.OPENAI_API_KEY }),
};

/**
 * Extracts audio from YouTube video and transcribes it using OpenAI Whisper
 */
export const transcribeYouTubeAudio = async (
  videoId: string,
  options: TranscriptionOptions = {},
  helpers: TranscriptionHelpers = defaultHelpers,
): Promise<string> => {
  if (env.DISABLE_OPENAI) {
    throw new Error('Audio transcription disabled');
  }

  const {
    maxDurationMinutes = 30,
    audioQuality = 'worst',
    tempDir = '/tmp',
    language = 'en',
    forceEnglish = false,
  } = options;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);

  try {
    // Download audio
    await helpers.downloadAudio(videoUrl, audioPath, {
      maxDurationMinutes,
      audioQuality,
    });
    if (!helpers.fileExists(audioPath)) {
      throw new Error(
        `Audio extraction failed - file not created. Video may be too long (>${maxDurationMinutes}min) or unavailable.`,
      );
    }
    // Transcribe
    const transcription = await helpers.transcribeAudioWithOpenAI(
      audioPath,
      language,
      forceEnglish,
    );
    await helpers.unlinkFile(audioPath);
    return transcription;
  } catch (error: any) {
    try {
      if (helpers.fileExists(audioPath)) {
        await helpers.unlinkFile(audioPath);
      }
    } catch {}
    // Only check actual duration if error is about duration or file not created
    const duration = await helpers.getVideoDuration(videoId);
    if (duration > maxDurationMinutes) {
      throw new Error(
        `Video ${videoId} is too long (>${maxDurationMinutes} minutes) for audio transcription`,
      );
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
