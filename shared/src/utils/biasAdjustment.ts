export type BiasImpact = {
  name: string;
  severity: 'low' | 'moderate' | 'high';
  scoreInfluence: number;
  impactOnExperience: string;
  explanation: string;
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
