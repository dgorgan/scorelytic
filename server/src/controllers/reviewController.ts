// TODO: Implement reviewController for review-related business logic

import { Request, Response } from 'express';
import { ReviewAnalysisRequest, ReviewAnalysisResponse, ApiResponse } from '@scorelytic/shared';
import { validateInput } from '@/utils/validateInput';
import { analyzeText } from '@/services/sentiment';
import { getReviewMetadata } from '@/services/youtube/reviewMetadataService';

export const reviewController = {
  analyzeReview: async (
    req: Request<{}, {}, ReviewAnalysisRequest>,
    res: Response<ApiResponse<ReviewAnalysisResponse>>,
  ) => {
    try {
      const { reviewId } = req.body;

      // Validate input
      if (!validateInput({ reviewId })) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input: reviewId must be a valid string',
        });
      }

      // Get review metadata from YouTube
      const metadata = await getReviewMetadata(reviewId);

      if (!metadata) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      if (!metadata.description || metadata.description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No transcript/description available for this review',
        });
      }

      // Analyze sentiment of the review
      const sentiment = await analyzeText(metadata.description || '');

      return res.json({
        success: true,
        data: {
          reviewId,
          sentiment,
          metadata: {
            gameTitle: metadata.gameTitle,
            creatorName: metadata.channelTitle,
            publishedAt: metadata.publishedAt,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze review',
      });
    }
  },
};
