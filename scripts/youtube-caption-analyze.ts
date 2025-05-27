#!/usr/bin/env ts-node
import 'dotenv/config';
import { fetchYoutubeCaptions, normalizeYoutubeToReview, upsertReviewToSupabase } from '../server/src/services/youtube/captionIngestService';
import { supabase } from '../server/src/config/database';
import { analyzeText } from '../server/src/services/sentimentService';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('videoId', { type: 'string', demandOption: true })
  .option('gameSlug', { type: 'string', demandOption: true })
  .option('creatorSlug', { type: 'string', demandOption: true })
  .option('gameTitle', { type: 'string' })
  .option('creatorName', { type: 'string' })
  .option('channelUrl', { type: 'string' })
  .option('model', { type: 'string', default: 'gpt-3.5-turbo' })
  .option('prompt', { type: 'string' })
  .help()
  .argv as any;

(async () => {
  try {
    // 1. Fetch captions
    const transcript = await fetchYoutubeCaptions(argv.videoId);
    // 2. Upsert review
    const review = await normalizeYoutubeToReview({
      videoId: argv.videoId,
      transcript,
      gameSlug: argv.gameSlug,
      creatorSlug: argv.creatorSlug,
      channelUrl: argv.channelUrl,
      gameTitle: argv.gameTitle,
      creatorName: argv.creatorName
    });
    await upsertReviewToSupabase(review);
    // 3. Get reviewId
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id,transcript')
      .eq('video_url', `https://www.youtube.com/watch?v=${argv.videoId}`)
      .maybeSingle();
    if (error || !reviews) throw new Error('Review not found after upsert');
    // 4. Run LLM analysis
    const sentiment = await analyzeText(reviews.transcript, argv.model, argv.prompt);
    console.log('\n=== Sentiment Analysis Result ===');
    console.log(JSON.stringify(sentiment, null, 2));
  } catch (err) {
    console.error('[ERROR]', (err as Error).message);
    process.exit(1);
  }
})(); 