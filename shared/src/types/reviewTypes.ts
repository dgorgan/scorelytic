import type { BiasImpact } from '@/utils/biasAdjustment';

export * from './Review';

export interface DemoReview {
  id: string;
  video_url: string;
  metadata?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
    tags?: string[];
    description?: string;
  };
  slug?: string;
  data: {
    sentiment: {
      pros?: string[];
      cons?: string[];
      sentimentSummary?: string;
      sentimentSummaryFriendlyVerdict?: string;
      reviewSummary?: string;
      alsoRecommends?: string[];
      biasDetection?: {
        originalScore: number;
        biasesDetected: BiasImpact[];
        noBiasExplanation?: string;
        reviewSummary?: string;
      };
      biasAdjustment?: {
        rationale: string;
        biasAdjustedScore: number;
        biasAdjustedScoreRaw?: number;
        totalScoreAdjustment: number;
        totalScoreAdjustmentRaw?: number;
      };
      biasIndicators?: string[];
      culturalContext?: {
        justification: string;
        audienceReactions: {
          aligned: string;
          neutral: string;
          opposed: string;
        };
        ideologicalThemes: string[];
      };
      sentimentSnapshot?: {
        verdict: string;
        inferredScore: number;
        confidenceLevel: string;
        recommendationStrength: string;
      };
      noBiasExplanation?: string;
    };
    debug?: string[];
  };
}
