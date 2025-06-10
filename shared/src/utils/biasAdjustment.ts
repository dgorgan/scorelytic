export type BiasImpact = {
  name: string;
  severity: 'low' | 'moderate' | 'high';
  scoreInfluence: number;
  impactOnExperience: string;
  explanation: string;
  confidenceScore: number; // 0-1
  adjustedInfluence: number; // scoreInfluence * confidenceScore
  detectedIn: string[]; // e.g., ['tone', 'phrasing', 'keywords']
  reviewerIntent: 'explicit' | 'implied' | 'unclear';
  evidence: string[]; // phrases or quotes from the review
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
