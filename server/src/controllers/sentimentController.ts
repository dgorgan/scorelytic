import { Request, Response } from 'express';
import { analyzeSentiment } from '@/services/sentiment';
import {
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
  ApiResponse,
} from '@/shared/types/api';
import { validateInput } from '@/utils/validateInput';

export const sentimentController = {
  analyze: async (
    req: Request<{}, {}, SentimentAnalysisRequest>,
    res: Response<ApiResponse<SentimentAnalysisResponse>>,
  ) => {
    try {
      const { text } = req.body;

      // Validate input
      if (!validateInput({ text })) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input: text must be a non-empty string',
        });
      }

      // Analyze sentiment
      const sentiment = await analyzeSentiment(text);

      return res.json({
        success: true,
        data: {
          sentiment: {
            score: sentiment.sentimentScore ?? 0,
            summary: sentiment.summary ?? '',
            verdict: sentiment.verdict ?? '',
            pros: sentiment.pros,
            cons: sentiment.cons,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze sentiment',
      });
    }
  },
};
