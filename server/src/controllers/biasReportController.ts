import { Request, Response } from 'express';
import { validateInput } from '@/utils/validateInput';
import { generateBiasReport } from '@/services/sentiment/biasAdjustment';
import type { BiasReportRequest, ApiResponse } from '@scorelytic/shared';

export const biasReportController = {
  generateReport: async (
    req: Request<{}, {}, BiasReportRequest>,
    res: Response<ApiResponse<any>>,
  ) => {
    try {
      const { sentimentScore, biasIndicators } = req.body;

      // Validate input
      if (!validateInput({ sentimentScore, biasIndicators })) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid input: sentimentScore must be a number and biasIndicators must be an array',
        });
      }

      // Generate report
      const report = generateBiasReport(sentimentScore, biasIndicators);

      return res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate bias report',
      });
    }
  },
};
