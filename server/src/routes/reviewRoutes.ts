import express from 'express';
import { supabase } from '../config/database';
import { analyzeText } from '../services/sentimentService';

const router = express.Router();

router.post('/:reviewId/analyze', async (req, res) => {
  const { reviewId } = req.params;
  // Fetch review
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .limit(1);
  if (error || !reviews || reviews.length === 0) {
    return res.status(404).json({ error: 'Review not found' });
  }
  const review = reviews[0];
  // Use transcript field if present, else fallback to videoUrl (for now)
  const transcript = review.transcript || review.videoUrl || '';
  if (!transcript) {
    return res.status(400).json({ error: 'No transcript available for this review' });
  }
  try {
    const sentiment = await analyzeText(transcript);
    await supabase
      .from('reviews')
      .update({ sentimentSummary: JSON.stringify(sentiment) })
      .eq('id', reviewId);
    res.json(sentiment);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sentiment analysis failed' });
  }
});

export default router;
