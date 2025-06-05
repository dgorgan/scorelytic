import type { BiasDetail, CulturalContext, FullBiasReport } from '../index';

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

const BIAS_HEURISTICS: Record<string, Omit<BiasImpact, 'name'>> = {
  'nostalgia bias': {
    severity: 'moderate',
    scoreInfluence: 0.4,
    impactOnExperience: 'More positive for fans of the franchise',
    explanation: 'Frequent comparisons to earlier entries, possibly inflating enthusiasm.',
  },
  'franchise bias': {
    severity: 'low',
    scoreInfluence: 0.2,
    impactOnExperience: 'More positive for series fans',
    explanation: 'Loyalty to the series may increase the score.',
  },
  'influencer bias': {
    severity: 'high',
    scoreInfluence: 1.0,
    impactOnExperience: 'Possible positive skew due to external incentives.',
    explanation: 'Influencer/sponsored bias detected; possible positive skew.',
  },
  'sponsored bias': {
    severity: 'high',
    scoreInfluence: 1.0,
    impactOnExperience: 'Possible positive skew due to sponsorship.',
    explanation: 'Sponsored bias detected; possible positive skew.',
  },
  contrarian: {
    severity: 'moderate',
    scoreInfluence: -0.5,
    impactOnExperience: 'Possible negative skew against consensus.',
    explanation: 'Contrarian bias detected; possible negative skew.',
  },
  'genre aversion': {
    severity: 'low',
    scoreInfluence: -0.3,
    impactOnExperience: 'Possible negative skew due to personal genre preferences.',
    explanation: 'Genre aversion detected; possible negative skew.',
  },
  'reviewer fatigue': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    impactOnExperience: 'Fatigue may lead to harsher criticism or lack of enthusiasm.',
    explanation: 'Reviewer fatigue detected; possible negative skew.',
  },
  'technical criticism': {
    severity: 'low',
    scoreInfluence: -0.2,
    impactOnExperience: 'Focus on technical flaws may overshadow other aspects.',
    explanation: 'Technical criticism bias detected.',
  },
  'platform bias': {
    severity: 'moderate',
    scoreInfluence: 0.2,
    impactOnExperience: 'Platform preference may affect objectivity.',
    explanation: 'Platform bias detected.',
  },
  'accessibility bias': {
    severity: 'low',
    scoreInfluence: 0,
    impactOnExperience: 'Accessibility focus may affect overall impression.',
    explanation: 'Accessibility bias detected.',
  },
  'story-driven bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    impactOnExperience: 'Preference for story-driven games may affect evaluation.',
    explanation: 'Story-driven bias detected.',
  },
  'identity signaling bias': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    impactOnExperience:
      'Positive for players valuing identity expression; less immersive for others.',
    explanation:
      'Identity themes are foregrounded, which may enhance or detract from immersion depending on player alignment.',
  },
  'representation bias': {
    severity: 'moderate',
    scoreInfluence: -0.2,
    impactOnExperience:
      'Emphasis on representation may resonate with some, but feel forced to others.',
    explanation:
      'Strong focus on representation detected; may affect perceived authenticity or immersion.',
  },
  'narrative framing bias': {
    severity: 'high',
    scoreInfluence: -0.3,
    impactOnExperience: 'Story heavily tied to contemporary sociopolitical themes.',
    explanation:
      'Narrative framing aligns with current ideological trends, which may polarize audiences.',
  },
};

export const evaluateBiasImpact = (
  sentimentScore: number,
  biasIndicators: string[],
): BiasAdjustmentOutput => {
  const biasImpact: BiasImpact[] = biasIndicators.map((label) => ({
    name: label,
    ...(BIAS_HEURISTICS[label] || {
      severity: 'low',
      scoreInfluence: 0,
      impactOnExperience: 'Unknown',
      explanation: 'No specific heuristic.',
    }),
  }));

  const totalScoreAdjustment = biasImpact.reduce((sum, b) => sum + b.scoreInfluence, 0);
  const biasAdjustedScore = Math.max(
    0,
    Math.min(10, Math.round((sentimentScore + totalScoreAdjustment) * 10) / 10),
  );

  return {
    sentimentScore,
    biasAdjustedScore,
    totalScoreAdjustment,
    biasImpact,
    audienceFit: biasImpact.length
      ? 'Best for audiences matching detected biases (e.g., franchise fans, genre enthusiasts).'
      : 'General gaming audience; no strong bias detected.',
    adjustmentRationale: biasImpact.length
      ? `The sentiment score was adjusted by ${totalScoreAdjustment > 0 ? '+' : ''}${totalScoreAdjustment} due to detected biases: ${biasImpact.map((b) => b.name).join(', ')}.`
      : 'No significant biases detected; score reflects general sentiment.',
  };
};

export const generateBiasReport = (
  sentimentScore: number,
  biasIndicators: string[],
): {
  summary: BiasSummary;
  details: BiasDetail[];
  culturalContext: CulturalContext;
  fullReport: FullBiasReport;
} => {
  const biasDetails: BiasDetail[] = biasIndicators.map((label) => ({
    name: label,
    severity: BIAS_HEURISTICS[label]?.severity || 'low',
    scoreImpact: BIAS_HEURISTICS[label]?.scoreInfluence ?? 0,
    impactOnExperience: BIAS_HEURISTICS[label]?.impactOnExperience || 'Unknown',
    description: BIAS_HEURISTICS[label]?.explanation,
  }));

  const totalScoreAdjustment = biasDetails.reduce((sum, b) => sum + b.scoreImpact, 0);
  const biasAdjustedScore = Math.max(
    0,
    Math.min(10, Math.round((sentimentScore + totalScoreAdjustment) * 10) / 10),
  );

  const verdict =
    biasAdjustedScore >= 7.5
      ? 'generally positive'
      : biasAdjustedScore >= 5
        ? 'mixed'
        : 'generally negative';

  const confidence = biasIndicators.length > 2 ? 'moderate' : 'high';
  const recommendationStrength =
    biasAdjustedScore >= 8 ? 'strong' : biasAdjustedScore >= 6 ? 'moderate' : 'weak';

  const audienceReaction = {
    aligned: 'positive',
    neutral: 'mixed',
    opposed: 'negative',
  };

  return {
    summary: {
      adjustedScore: biasAdjustedScore,
      verdict,
      confidence,
      recommendationStrength,
      biasSummary: biasIndicators.length
        ? `Includes ${biasIndicators.map((b) => b.replace(/ bias$/, '')).join(', ')} bias${biasIndicators.length > 1 ? 'es' : ''}.`
        : undefined,
    },
    details: biasDetails,
    culturalContext: {
      originalScore: sentimentScore,
      biasAdjustedScore,
      justification: biasIndicators.length
        ? 'Score adjusted to reflect detected ideological, narrative, or identity-related influences.'
        : 'No significant ideological or cultural bias detected.',
      audienceReaction,
      biasDetails,
    },
    fullReport: {
      score_analysis_engine: {
        input_review_score: sentimentScore,
        ideological_biases_detected: biasDetails,
        bias_adjusted_score: biasAdjustedScore,
        score_context_note: 'This adjustment is a contextual calibration, not a value judgment.',
      },
    },
  };
};
