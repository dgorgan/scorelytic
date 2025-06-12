import { Router } from 'express';
import { upsertDemoReview } from '@/services/youtube/captionIngestService';
import { extractVideoId } from '../../../shared/src/utils/youtube';
import { runYouTubePipeline, runLLMOnlyPipeline } from '@/services/youtube/pipelineRunner';
import { supabase } from '@/config/database';
import logger from '@/logger';
import { env } from '@/config/env';

const router: ReturnType<typeof Router> = Router();

router.post('/batch-process', async (req, res) => {
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
              // Use the full pipeline (fetches transcript, metadata, etc)
              const data = await runYouTubePipeline(videoId, { llmModel });
              results.push({ videoId, status: 'success', data });
            } else if (mode === 'llm-only' || mode === 'llm-test') {
              // Use the LLM-only pipeline (uses cached transcript, skips YouTube)
              const data = await runLLMOnlyPipeline(videoId, { llmModel });
              if (mode === 'llm-only') {
                results.push({ videoId, status: 'success', data: { ...data, upserted: true } });
              } else {
                // llm-test: do not upsert (simulate by not calling upsertDemoReview inside runLLMOnlyPipeline)
                results.push({ videoId, status: 'success', data: { ...data, upserted: false } });
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
