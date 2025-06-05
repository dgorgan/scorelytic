import YTDlpWrap from 'yt-dlp-wrap';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { env } from '@/config/env';
import { execSync } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

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
    const cookiesPath = path.resolve(__dirname, '../../../cookies.txt');
    const cookiesExists = fs.existsSync(cookiesPath);
    const cookiesContent = cookiesExists ? fs.readFileSync(cookiesPath, 'utf8') : '';
    const crypto = require('crypto');
    const cookiesHash = cookiesExists
      ? crypto.createHash('sha256').update(cookiesContent).digest('hex')
      : null;
    // Debug logs
    // eslint-disable-next-line no-console
    console.log('[yt-dlp] cookies.txt path:', cookiesPath);
    // eslint-disable-next-line no-console
    console.log('[yt-dlp] cookies.txt exists:', cookiesExists);
    // eslint-disable-next-line no-console
    if (cookiesExists) console.log('[yt-dlp] cookies.txt sha256:', cookiesHash);
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
      '--cookies',
      cookiesPath,
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
    const cookiesPath = path.resolve(__dirname, '../../../cookies.txt');
    const cookiesExists = fs.existsSync(cookiesPath);
    const cookiesContent = cookiesExists ? fs.readFileSync(cookiesPath, 'utf8') : '';
    const crypto = require('crypto');
    const cookiesHash = cookiesExists
      ? crypto.createHash('sha256').update(cookiesContent).digest('hex')
      : null;
    // Debug logs
    // eslint-disable-next-line no-console
    console.log('[yt-dlp] cookies.txt path:', cookiesPath);
    // eslint-disable-next-line no-console
    console.log('[yt-dlp] cookies.txt exists:', cookiesExists);
    // eslint-disable-next-line no-console
    if (cookiesExists) console.log('[yt-dlp] cookies.txt sha256:', cookiesHash);
    const ytDlpWrap = new YTDlpWrap();
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const out = await ytDlpWrap.execPromise([videoUrl, '--dump-json', '--cookies', cookiesPath]);
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
      for (const chunkPath of chunkPaths) {
        transcript += await helpers.transcribeAudioWithOpenAI(chunkPath, language, forceEnglish);
        await helpers.unlinkFile(chunkPath);
      }
      await helpers.unlinkFile(audioPath);
      return transcript;
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
    const out = await ytDlpWrap.execPromise([
      videoUrl,
      '--dump-json',
      '--cookies',
      path.resolve(__dirname, '../../../cookies.txt'),
    ]);
    const info = JSON.parse(out);
    return Math.ceil((info.duration || 0) / 60); // Return duration in minutes
  } catch (error: any) {
    throw new Error(`Failed to get video duration: ${error.message}`);
  }
};
