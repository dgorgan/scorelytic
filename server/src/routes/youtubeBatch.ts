import { Router } from 'express';
import { upsertDemoReview } from '@/services/youtube/captionIngestService';
import { analyzeTextWithBiasAdjustmentFull } from '@/services/sentiment/sentimentService';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { extractVideoId } from '../../../shared/src/utils/youtube';

const router: ReturnType<typeof Router> = Router();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const API_URL = 'http://localhost:5000/api/youtube/process';

router.post('/batch-process', async (req, res) => {
  const fetch = (await import('node-fetch')).default;
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(3);

  const {
    videoIds,
    mode = 'full',
    llmModel,
  } = req.body as {
    videoIds?: string[];
    mode?: 'full' | 'llm-only' | 'llm-test';
    llmModel?: string;
  };
  // Extract video IDs from URLs or IDs
  let ids: string[] = (videoIds || [])
    .map((id) => extractVideoId(id))
    .filter((id): id is string => !!id);
  const results: any[] = [];

  try {
    if ((mode === 'llm-only' || mode === 'llm-test') && (!ids || ids.length === 0)) {
      // Fetch all demo_reviews
      const { data: reviews, error } = await supabase.from('demo_reviews').select('video_url');
      if (error) throw new Error('Failed to fetch demo_reviews: ' + error.message);
      ids = reviews.map((r: any) => (r.video_url || '').split('v=')[1]).filter(Boolean);
    }

    await Promise.all(
      ids.map((videoId) =>
        limit(async () => {
          try {
            if (mode === 'full') {
              const payload = { videoId, demoMode: true };
              const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const data = await resp.json();
              results.push({ videoId, status: 'success', data });
            } else if (mode === 'llm-only' || mode === 'llm-test') {
              // Fetch transcript from demo_reviews
              const { data: reviews, error } = await supabase
                .from('demo_reviews')
                .select('id, video_url, data, slug, transcript')
                .eq('video_url', `https://www.youtube.com/watch?v=${videoId}`);
              if (error) throw new Error('Failed to fetch demo_review: ' + error.message);
              if (!reviews?.length) throw new Error('No demo_review found');
              const review = reviews[0];
              const transcript = review.transcript;
              if (!transcript?.trim()) throw new Error('No transcript');
              const llmResult = await analyzeTextWithBiasAdjustmentFull(
                transcript,
                llmModel || 'o3-pro',
              );
              if (mode === 'llm-only') {
                const newData = { ...review.data, sentiment: llmResult.sentiment };
                await upsertDemoReview(review.video_url, newData, review.slug);
                results.push({
                  videoId,
                  status: 'success',
                  data: { sentiment: llmResult.sentiment, upserted: true },
                });
              } else {
                // llm-test: do not upsert
                results.push({
                  videoId,
                  status: 'success',
                  data: { sentiment: llmResult.sentiment, upserted: false },
                });
              }
            }
          } catch (err: any) {
            results.push({ videoId, status: 'error', error: err.message || String(err) });
          }
        }),
      ),
    );
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err), results });
  }
});

// New endpoint: upsert LLM result for a videoId
router.post('/upsert-llm', async (req, res) => {
  const { videoId, sentiment } = req.body as { videoId: string; sentiment: any };
  try {
    const { data: reviews, error } = await supabase
      .from('demo_reviews')
      .select('id, video_url, data, slug, transcript')
      .eq('video_url', `https://www.youtube.com/watch?v=${videoId}`);
    if (error) throw new Error('Failed to fetch demo_review: ' + error.message);
    if (!reviews?.length) throw new Error('No demo_review found');
    const review = reviews[0];
    const newData = { ...review.data, sentiment };
    await upsertDemoReview(review.video_url, newData, review.slug);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
