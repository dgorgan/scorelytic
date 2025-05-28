import express from 'express';
import { generateBiasReport } from 'shared/utils/biasAdjustment';
import { ReviewSummary, BiasDetail, CulturalContext, FullBiasReport } from 'shared/types/biasReport';

const router = express.Router();

router.post('/api/review/bias-report', (req, res) => {
  const { sentimentScore, biasIndicators } = req.body;
  if (typeof sentimentScore !== 'number' || !Array.isArray(biasIndicators)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const report = generateBiasReport(sentimentScore, biasIndicators);
  res.json(report);
});

export default router; 