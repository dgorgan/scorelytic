import YTDlpWrap from 'yt-dlp-wrap';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { env } from '@/config/env';
import { execSync } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
// import logger from '@/logger';

const unlinkAsync = promisify(fs.unlink);

export interface TranscriptionOptions {
  maxDurationMinutes?: number; // Default: 30 minutes
  audioQuality?: 'worst' | 'best'; // Default: worst (smaller files)
  tempDir?: string; // Default: /tmp
  language?: string; // Default: 'en'
  forceEnglish?: boolean; // If true, use translation endpoint
  useCookies?: boolean; // Optional: use cookies.txt for yt-dlp
}

export interface TranscriptionHelpers {
  downloadAudio: (
    videoUrl: string,
    audioPath: string,
    options: TranscriptionOptions,
  ) => Promise<void>;
  transcribeAudioWithOpenAI: (
    audioPath: string,
    language: string,
    forceEnglish?: boolean,
  ) => Promise<string>;
  getVideoDuration: (videoId: string, useCookies?: boolean) => Promise<number>;
  fileExists: (filePath: string) => boolean;
  unlinkFile: (filePath: string) => Promise<void>;
  createReadStream: (filePath: string) => fs.ReadStream;
  getOpenAI: () => OpenAI;
}

const defaultHelpers: TranscriptionHelpers = {
  downloadAudio: async (
    videoUrl,
    audioPath,
    { maxDurationMinutes = 30, audioQuality, useCookies },
  ) => {
    const ytDlpWrap = new YTDlpWrap();
    const args: string[] = [
      videoUrl,
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      audioQuality ?? 'worst',
      '--match-filter',
      `duration < ${(maxDurationMinutes ?? 30) * 60}`,
      '--output',
      audioPath.replace('.mp3', '.%(ext)s'),
      '--no-playlist',
    ];
    if (useCookies) {
      const cookiesPath = path.join(process.cwd(), 'src/cookies.txt');
      if (fs.existsSync(cookiesPath)) {
        args.push('--cookies');
        args.push(cookiesPath);
      }
    }
    await retryWithBackoff(() => ytDlpWrap.execPromise(args));
  },
  transcribeAudioWithOpenAI: async (audioPath, language) => {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const transcription = await retryWithBackoff(() =>
      openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language,
        response_format: 'text',
      }),
    );
    return transcription;
  },
  getVideoDuration: async (videoId, useCookies) => {
    const ytDlpWrap = new YTDlpWrap();
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [videoUrl, '--dump-json'];
    if (useCookies) {
      const cookiesPath = path.join(process.cwd(), 'src/cookies.txt');
      if (fs.existsSync(cookiesPath)) {
        args.push('--cookies', cookiesPath);
      }
    }
    const out = await retryWithBackoff(() => ytDlpWrap.execPromise(args));
    const info = JSON.parse(out);
    return Math.ceil((info.duration || 0) / 60);
  },
  fileExists: (filePath) => fs.existsSync(filePath),
  unlinkFile: (filePath) => unlinkAsync(filePath),
  createReadStream: (filePath: string) => fs.createReadStream(filePath),
  getOpenAI: () => new OpenAI({ apiKey: env.OPENAI_API_KEY }),
};

// Helper: Get audio duration (seconds) using fluent-ffmpeg
const getAudioDuration = (audioPath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err: any, metadata: any) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });

// Helper: Split audio file into ≤25MB chunks using ffmpeg (async)
const splitAudioFile = async (
  audioPath: string,
  maxChunkBytes = 25 * 1024 * 1024,
): Promise<string[]> => {
  const fs = require('fs');
  const path = require('path');
  const stat = fs.statSync(audioPath);
  if (stat.size <= maxChunkBytes) return [audioPath];
  // Get duration in seconds (async)
  const duration = await getAudioDuration(audioPath);
  // Estimate chunk duration
  const numChunks = Math.ceil(stat.size / maxChunkBytes);
  const chunkDuration = Math.ceil(duration / numChunks);
  const chunkPaths: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const chunkPath = audioPath.replace(/\.mp3$/, `.chunk${i}.mp3`);
    execSync(
      `ffmpeg -y -i "${audioPath}" -ss ${i * chunkDuration} -t ${chunkDuration} -c copy "${chunkPath}"`,
    );
    chunkPaths.push(chunkPath);
  }
  return chunkPaths;
};

// --- Retry helper ---
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500,
): Promise<T> => {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || '';
      if (
        attempt < maxRetries - 1 &&
        (msg.includes('timeout') ||
          msg.includes('502') ||
          msg.includes('rate limit') ||
          msg.includes('429') ||
          msg.includes('network') ||
          (err.response && err.response.status >= 500))
      ) {
        const delay = baseDelay * Math.pow(2, attempt);
        // eslint-disable-next-line no-console
        console.warn(
          `[Whisper] Retry ${attempt + 1}/${maxRetries} after error: ${msg}. Waiting ${delay}ms...`,
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      break;
    }
  }
  throw lastErr;
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
    useCookies = false,
  } = options;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);

  try {
    // Download audio
    await helpers.downloadAudio(videoUrl, audioPath, {
      maxDurationMinutes,
      audioQuality,
      useCookies,
    });
    if (!helpers.fileExists(audioPath)) {
      throw new Error(
        `Audio extraction failed - file not created. Video may be too long (> ${maxDurationMinutes}min) or unavailable.`,
      );
    }
    // --- Chunking logic ---
    const fs = require('fs');
    const stat = fs.statSync(audioPath);
    let transcript = '';
    if (stat.size > 25 * 1024 * 1024) {
      // Split and transcribe each chunk
      const chunkPaths = await splitAudioFile(audioPath);
      // Parallelize chunk transcription with concurrency limit
      const pLimit = require('p-limit');
      const limit = pLimit(3); // Limit concurrency to 3
      const transcribeChunk = (chunkPath: string) =>
        helpers
          .transcribeAudioWithOpenAI(chunkPath, language, forceEnglish)
          .finally(() => helpers.unlinkFile(chunkPath));
      // Maintain order by mapping to index
      const chunkPromises = chunkPaths.map((chunkPath) => limit(() => transcribeChunk(chunkPath)));
      const transcripts = await Promise.all(chunkPromises);
      await helpers.unlinkFile(audioPath);
      return transcripts.join('');
    } else {
      // Transcribe whole file
      transcript = await helpers.transcribeAudioWithOpenAI(audioPath, language, forceEnglish);
      await helpers.unlinkFile(audioPath);
      return transcript;
    }
  } catch (error: any) {
    try {
      if (helpers.fileExists(audioPath)) {
        await helpers.unlinkFile(audioPath);
      }
    } catch {}
    // Only check actual duration if error is about duration or file not created
    const duration = await helpers.getVideoDuration(videoId, useCookies);
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
export const getVideoDuration: (videoId: string, useCookies?: boolean) => Promise<number> = async (
  videoId,
  useCookies = false,
) => {
  const ytDlpWrap = new YTDlpWrap();
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [videoUrl, '--dump-json'];
  if (useCookies) {
    const cookiesPath = path.join(process.cwd(), 'src/cookies.txt');
    if (fs.existsSync(cookiesPath)) {
      args.push('--cookies');
      args.push(cookiesPath);
    }
  }
  try {
    const out = await retryWithBackoff(() => ytDlpWrap.execPromise(args));
    const info = JSON.parse(out);
    return Math.ceil((info.duration || 0) / 60); // Return duration in minutes
  } catch (error: any) {
    throw new Error(`Failed to get video duration: ${error.message}`);
  }
};
