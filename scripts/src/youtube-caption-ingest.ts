#!/usr/bin/env ts-node
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  fetchYoutubeCaptions,
  normalizeYoutubeToReview,
  upsertReviewToSupabase,
  supabase,
} from '@scorelytic/server';
import fs from 'fs';

const argv = yargs(hideBin(process.argv))
  .option('ids', {
    alias: 'i',
    type: 'array',
    description: 'List of YouTube video IDs',
  })
  .option('file', {
    alias: 'f',
    type: 'string',
    description: 'Path to file with YouTube video IDs (one per line, or JSON with metadata)',
  })
  .option('gameSlug', {
    type: 'string',
    description: 'Game slug',
  })
  .option('creatorSlug', {
    type: 'string',
    description: 'Creator slug',
  })
  .option('gameTitle', {
    type: 'string',
    description: 'Game title (optional, for auto-create)',
  })
  .option('creatorName', {
    type: 'string',
    description: 'Creator name (optional, for auto-create)',
  })
  .option('channelUrl', {
    type: 'string',
    description: 'Creator channel URL (optional, for auto-create)',
  })
  .conflicts('ids', 'file')
  .check((argv) => {
    if (!argv.ids && !argv.file) {
      throw new Error('Provide --ids or --file');
    }
    if (!argv.gameSlug || !argv.creatorSlug) {
      throw new Error('Provide --gameSlug and --creatorSlug');
    }
    return true;
  })
  .help().argv as any;

const getVideoMetas = (): { videoId: string; [k: string]: any }[] => {
  if (argv.ids) {
    return argv.ids.map((id: string) => ({
      videoId: id,
      gameSlug: argv.gameSlug,
      creatorSlug: argv.creatorSlug,
      gameTitle: argv.gameTitle,
      creatorName: argv.creatorName,
      channelUrl: argv.channelUrl,
    }));
  }
  if (argv.file) {
    const content = fs.readFileSync(argv.file, 'utf-8');
    try {
      // Try JSON first (array of objects with videoId, gameSlug, etc.)
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) return arr;
    } catch {}
    // Fallback: one video ID per line
    return content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((videoId) => ({
        videoId,
        gameSlug: argv.gameSlug,
        creatorSlug: argv.creatorSlug,
        gameTitle: argv.gameTitle,
        creatorName: argv.creatorName,
        channelUrl: argv.channelUrl,
      }));
  }
  throw new Error('No video IDs provided');
};

const logError = (msg: string) => {
  fs.appendFileSync('errors.log', msg + '\n');
};

(async () => {
  const videoMetas = getVideoMetas();
  const results = [];
  for (const meta of videoMetas) {
    try {
      console.log(`[YT] Fetching captions for videoId: ${meta.videoId}`);
      const transcript = await fetchYoutubeCaptions(meta.videoId);
      // Deduplication: check if review already exists
      const { data: existing, error: checkErr } = await supabase
        .from('reviews')
        .select('id')
        .eq('video_url', `https://www.youtube.com/watch?v=${meta.videoId}`)
        .maybeSingle();
      if (checkErr) throw new Error(`Deduplication check failed: ${checkErr.message}`);
      if (existing) {
        console.log(`[SKIP] Review for videoId ${meta.videoId} already exists.`);
        results.push({
          videoId: meta.videoId,
          status: 'skipped',
          reason: 'already exists',
        });
        continue;
      }
      const review = await normalizeYoutubeToReview({
        videoId: meta.videoId,
        transcript,
        gameSlug: meta.gameSlug,
        creatorSlug: meta.creatorSlug,
        channelUrl: meta.channelUrl,
        gameTitle: meta.gameTitle,
        creatorName: meta.creatorName,
        publishedAt: meta.publishedAt,
      });
      await upsertReviewToSupabase(review);
      console.log(`[SUCCESS] Ingested review for videoId: ${meta.videoId}`);
      results.push({ videoId: meta.videoId, status: 'success' });
    } catch (err) {
      const msg = `[ERROR] videoId: ${meta.videoId} - ${(err as Error).message}`;
      console.error(msg);
      logError(msg);
      results.push({
        videoId: meta.videoId,
        status: 'error',
        error: (err as Error).message,
      });
    }
  }
  console.log('Ingestion summary:', results);
})();
