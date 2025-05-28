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
  scoreImpact: number;
  impactOnExperience: string;
  description?: string;
};

export type CulturalContext = {
  originalScore: number;
  biasAdjustedScore: number;
  justification: string;
  audienceReaction: {
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