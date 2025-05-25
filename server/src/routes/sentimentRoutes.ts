import express from 'express';
import { analyzeText } from '../services/sentimentService';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }
  try {
    const sentiment = await analyzeText(text);
    res.json(sentiment);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sentiment analysis failed' });
  }
});

export default router; 