export * from './Review';

export type yes = {
  justification: string;
  ideologicalThemes: string[];
  playerFit: {
    aligned: string;
    neutral: string;
    opposed: string;
  };
};

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
      sentimentScore?: number;
      verdict?: string;
      satirical?: boolean;
      biasIndicators?: string[];
      legacyAndInfluence?: yes;
      noBiasExplanationFromLLM?: string;
    };
    biasDetection?: {
      originalScore: number;
      biasesDetected?: Array<{
        name: string;
        severity: string;
        impactOnExperience: string;
        scoreInfluence: string;
        explanation: string;
      }>;
      noBiasExplanation?: string;
      evidenceCount?: number;
    };
    biasAdjustment?: {
      rationale: string;
      biasAdjustedScore: number;
      biasAdjustedScoreRaw?: number;
      totalScoreAdjustment: number;
      totalScoreAdjustmentRaw?: number;
    };
    sentimentSnapshot?: {
      verdict: string;
      inferredScore: number;
      confidenceLevel: string;
      recommendationStrength: string;
    };
    debug?: string[];
  };
}
