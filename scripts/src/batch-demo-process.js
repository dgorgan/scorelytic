// ===================== Imports =====================
import pLimit from 'p-limit';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { analyzeTextWithBiasAdjustmentFull } from '@/services/sentiment/sentimentService';
import { upsertDemoReview } from '@/services/youtube/captionIngestService';

// ===================== Setup =====================
const API_URL = 'http://localhost:5000/api/youtube/process';
const videoIds = [
  // 'bgecA94pBFs', 'sHO9OW0_ocg', '6lrihmd9Exo',
  // '6kothCE21ks', 'dQw4w9WgXcQ', 'yoFvVAMcwOE',
  // 'kMzqGUyoG1U', 'voX0IY71_jw', 'F6dZxoob8CY',
  // 'MHrsygIxC5k', 'VpevTNRK-_M', 'JliVeSsajO0',
  // 'Vf3Kpi_OZqE',
  'TuFUFiz4Emc',
];
const limit = pLimit(5); // Limit concurrency
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ===================== Batch Process Function =====================
async function runBatch() {
  const tasks = videoIds.map((videoId) =>
    limit(async () => {
      const payload = { videoId, demoMode: true };
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('✅ Processed videoId:', videoId, data);
    }),
  );

  await Promise.all(tasks);
  console.log('🚀 Batch processing complete.');
}

// ===================== Single Video LLM Analysis =====================
async function runSingleLLMAnalysis(videoId) {
  console.log(`[LLM] Fetching demo_review for videoId: ${videoId}`);

  const { data: reviews, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data, slug')
    .eq('video_url', `https://www.youtube.com/watch?v=${videoId}`);

  if (error) throw new Error('❌ Failed to fetch demo_review: ' + error.message);
  if (!reviews?.length) {
    console.log(`[LLM] ⚠️ No demo_review found for videoId: ${videoId}`);
    return;
  }

  const review = reviews[0];
  const transcript = review.transcript;

  if (!transcript?.trim()) {
    console.log(`[LLM] ⏩ Skipping ${review.video_url}: no transcript`);
    return;
  }

  console.log(`[LLM] 🧠 Running LLM bias/sentiment analysis for ${review.video_url}`);
  const llmResult = await analyzeTextWithBiasAdjustmentFull(transcript, 'gpt-4o');
  const newData = { ...review.data, sentiment: llmResult.sentiment };

  await upsertDemoReview(review.video_url, newData, review.slug, transcript);
  console.log(`[LLM] ✅ Updated sentiment for ${review.video_url}`);
}

// ===================== Full LLM Batch Analysis =====================
async function runLLMBatchOnDemoReviews() {
  console.log('[LLM] 🔄 Running full batch analysis on all demo_reviews...');

  const { data: reviews, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data, slug');

  if (error) throw new Error('❌ Failed to fetch demo_reviews: ' + error.message);

  for (const review of reviews) {
    const transcript = review.transcript;
    if (!transcript?.trim()) {
      console.log(`⏩ Skipping ${review.video_url}: no transcript`);
      continue;
    }

    const llmResult = await analyzeTextWithBiasAdjustmentFull(transcript, 'gpt-4o');
    const newData = { ...review.data, sentiment: llmResult.sentiment };
    await upsertDemoReview(review.video_url, newData, review.slug, transcript);
    console.log(`✅ Updated sentiment for ${review.video_url}`);
  }

  console.log('🎉 Full LLM batch processing complete.');
}

// ===================== CLI Entrypoint =====================
if (require.main === module) {
  const [, , cmd, arg] = process.argv;

  switch (cmd) {
    case 'single':
      if (arg) {
        runSingleLLMAnalysis(arg);
      } else {
        console.log('❌ Please provide a videoId for the single command.');
      }
      break;

    case 'batch':
      runBatch();
      break;

    case 'llm-batch':
      runLLMBatchOnDemoReviews();
      break;

    default:
      console.log('Usage: node batch-demo-process.js [batch|single <videoId>|llm-batch]');
  }
}

// ===================== How To Use =====================
// # Run the demoMode processing for a predefined list of videos
// node batch-demo-process.js batch

// # Run a single LLM sentiment/bias update for a specific videoId
// node batch-demo-process.js single TuFUFiz4Emc

// # Run full LLM sentiment analysis for all demo_reviews in Supabase
// node batch-demo-process.js llm-batch
