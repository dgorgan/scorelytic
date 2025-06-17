export type ReviewSummary = {
  adjustedScore: number;
  verdict: string;
  confidence: 'low' | 'moderate' | 'high';
  recommendationStrength: 'weak' | 'moderate' | 'strong';
  biasSummary?: string;
};

export type BiasDetail = {
  name: string;
  severity: string;
  baseScoreInfluence: number;
  maxScoreInfluence: number;
  impactOnExperience: string;
  explanation?: string;
  confidenceScore?: number;
  detectedIn?: string[];
  reviewerIntent?: 'explicit' | 'implied' | 'unclear';
  adjustedInfluence?: number;
  evidence?: string[];
  biasInteractionsApplied?: BiasInteractionEffect[];
};

export type legacyAndInfluence = {
  originalScore: number;
  biasAdjustedScore: number;
  justification: string;
  playerFit: {
    aligned: string;
    neutral: string;
    opposed: string;
  };
  biasDetails: BiasDetail[];
};

export type FullBiasReport = {
  score_analysis_engine: {
    input_review_score: number;
    ideological_biases_detected: BiasDetail[];
    bias_adjusted_score: number;
    score_context_note: string;
  };
};

export type BiasImpact = {
  name: string;
  severity: 'low' | 'moderate' | 'high';
  impactOnExperience: string;
  baseScoreInfluence: number;
  maxScoreInfluence: number;
  explanation: string;
  confidenceScore: number;
  adjustedInfluence: number;
  detectedIn: string[];
  reviewerIntent: 'explicit' | 'implied' | 'unclear';
  evidence: string[];
  biasInteractionsApplied?: BiasInteractionEffect[];
};

export type RhetoricalDevice = {
  name: 'sarcasm' | 'satirical' | 'hyperbole' | 'irony';
  detected: boolean;
  confidence: number; // 0-1
  scoreImpact: 'none' | 'inversion' | 'amplification';
  explanation: string;
  evidence: string[];
  handlingStrategy: 'flag_only' | 'score_inversion' | 'tone_indicator';
};

export type EnhancedBiasDetection = {
  cognitiveBiases: BiasImpact[];
  rhetoricalDevices: RhetoricalDevice[];
  evidenceCount: number;
  noBiasExplanation?: string;
};

export type BiasAdjustmentOutput = {
  sentimentScore: number;
  biasAdjustedScore: number;
  totalScoreAdjustment: number;
  biasImpact: BiasImpact[];
  audienceFit: string;
  adjustmentRationale: string;
};

export type BiasSummary = {
  adjustedScore: number;
  verdict: string;
  confidence: 'low' | 'moderate' | 'high';
  recommendationStrength: 'weak' | 'moderate' | 'strong';
  biasSummary?: string;
};

export type BiasInteractionEffect = {
  biases: [string, string];
  multiplier: number;
  influenceAdded: number;
};
