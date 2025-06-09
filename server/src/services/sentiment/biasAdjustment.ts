import type {
  BiasImpact,
  BiasAdjustmentOutput,
  BiasSummary,
  BiasDetail,
  CulturalContext,
  FullBiasReport,
} from '@scorelytic/shared';

// === BIAS_HEURISTICS sign convention ===
// Positive scoreInfluence: bias inflated the score (e.g. nostalgia, franchise, hype, platform)
// Negative scoreInfluence: bias deflated the score (e.g. contrarian, fatigue, genre aversion)
// Technical/identity/cultural biases: 0 (no adjustment)
const BIAS_HEURISTICS: Record<string, Omit<BiasImpact, 'name'>> = {
  'nostalgia bias': {
    severity: 'moderate',
    scoreInfluence: 0.5,
    impactOnExperience:
      "Nostalgia may inflate the reviewer's score beyond the game's objective merits.",
    explanation:
      'Nostalgia bias detected; reviewer may rate higher due to fondness for the franchise.',
  },
  'franchise bias': {
    severity: 'low',
    scoreInfluence: 0.3,
    impactOnExperience: 'Franchise loyalty may increase the score.',
    explanation: 'Franchise bias detected; loyalty to the series may inflate the score.',
  },
  'influencer bias': {
    severity: 'high',
    scoreInfluence: 0.6,
    impactOnExperience: 'Possible positive skew due to external incentives.',
    explanation: 'Influencer bias detected; possible inflated score from external pressure.',
  },
  'sponsored bias': {
    severity: 'high',
    scoreInfluence: 0.7,
    impactOnExperience: 'Possible positive skew due to sponsorship.',
    explanation: 'Sponsored bias detected; score may reflect brand partnership influence.',
  },
  'platform bias': {
    severity: 'moderate',
    scoreInfluence: 0.2,
    impactOnExperience: 'Platform loyalty may inflate the score.',
    explanation: 'Platform bias detected; platform preference may affect objectivity.',
  },
  'studio reputation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience: 'Studio reputation may inflate expectations and perceived quality.',
    explanation: 'Studio reputation bias detected; goodwill toward developer may boost score.',
  },
  'contrarian bias': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    impactOnExperience: 'Contrarian stance may deflate the score below consensus.',
    explanation: 'Contrarian bias detected; reviewer may underrate to go against the grain.',
  },
  'genre aversion': {
    severity: 'moderate',
    scoreInfluence: -0.3,
    impactOnExperience: 'Personal genre preferences may deflate the score.',
    explanation: 'Genre aversion detected; personal dislike may skew perception.',
  },
  'reviewer fatigue': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    impactOnExperience: 'Fatigue may lead to harsher criticism or lack of enthusiasm.',
    explanation: 'Reviewer fatigue detected; burnout may reduce generosity of evaluation.',
  },
  'technical criticism': {
    severity: 'low',
    scoreInfluence: -0.2,
    impactOnExperience: 'Focus on technical flaws may overshadow other aspects.',
    explanation: 'Technical criticism bias detected; nitpicking may lower score.',
  },
  'accessibility bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    impactOnExperience: 'Accessibility focus may affect overall impression.',
    explanation: 'Accessibility bias detected; inclusive features may positively influence score.',
  },
  'story-driven bias': {
    severity: 'low',
    scoreInfluence: 0.2,
    impactOnExperience: 'Preference for story-driven games may affect evaluation.',
    explanation:
      'Story-driven bias detected; strong narrative may disproportionately influence score.',
  },
  'identity signaling bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience:
      'Identity themes may enhance emotional connection, but may also overshadow objective assessment.',
    explanation:
      'Identity signaling bias detected; score may reflect cultural alignment more than gameplay.',
  },
  'representation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience:
      'Strong emphasis on diversity and inclusion may affect perception of quality, even if unrelated to gameplay.',
    explanation: 'Representation bias detected; inclusivity focus may skew score upward.',
  },
  'narrative framing bias': {
    severity: 'high',
    scoreInfluence: 0.4,
    impactOnExperience: 'Themes tied to current events or ideology may inflate reviewer sentiment.',
    explanation:
      'Narrative framing bias detected; reviewer may rate higher due to resonance with sociopolitical themes.',
  },
  'hype bias': {
    severity: 'high',
    scoreInfluence: 0.5,
    impactOnExperience: "Pre-release hype or marketing may inflate the reviewer's score.",
    explanation:
      'Hype bias detected; reviewer may be influenced by marketing or community excitement.',
  },
  'recency bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience: 'Recent releases may be rated higher due to novelty.',
    explanation: 'Recency bias detected; newness may inflate the score.',
  },
  'difficulty bias': {
    severity: 'low',
    scoreInfluence: -0.2,
    impactOnExperience: "Reviewer's preference for or against difficulty may affect score.",
    explanation: 'Difficulty bias detected; difficulty level may skew enjoyment.',
  },
  'graphics bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    impactOnExperience: 'Visual fidelity may disproportionately affect the score.',
    explanation: 'Graphics bias detected; visuals may overly influence perception.',
  },
  'multiplayer bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    impactOnExperience: 'Preference for or against multiplayer may affect evaluation.',
    explanation: 'Multiplayer bias detected; co-op/competitive leanings may affect impression.',
  },
  'price bias': {
    severity: 'low',
    scoreInfluence: -0.1,
    impactOnExperience: 'Perceived value or price may affect the score.',
    explanation: 'Price bias detected; pricing model may deflate or inflate score.',
  },
};

export const mapBiasLabelsToObjects = (
  biasLabels: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
): BiasImpact[] => {
  // Helper to check if a bias is mentioned in pros/cons/summary
  const findInText = (bias: string, arr: string[]) =>
    arr.some((text) => text.toLowerCase().includes(bias.split(' ')[0]));
  return biasLabels.map((label) => {
    const heur = BIAS_HEURISTICS[label] || {
      severity: 'low',
      scoreInfluence: 0,
      impactOnExperience: 'Unknown',
      explanation: 'No specific heuristic.',
    };
    const detectedIn: string[] = ['labels'];
    let severity = heur.severity;
    let scoreInfluence = heur.scoreInfluence;
    // Check for presence in pros/cons/summary
    if (findInText(label, pros)) detectedIn.push('pros');
    if (findInText(label, cons)) detectedIn.push('cons');
    if (reviewSummary.toLowerCase().includes(label.split(' ')[0])) detectedIn.push('summary');
    // If found in multiple places, increase severity/scoreInfluence
    if (detectedIn.length > 1) {
      severity = 'high';
      scoreInfluence = Math.sign(scoreInfluence) * (Math.abs(scoreInfluence) + 0.2);
    }
    return {
      name: label,
      severity,
      scoreInfluence,
      impactOnExperience: heur.impactOnExperience,
      explanation: heur.explanation,
      detectedIn,
    };
  });
};

export const evaluateBiasImpact = (
  sentimentScore: number,
  biasIndicators: string[],
): BiasAdjustmentOutput => {
  const biasImpact: BiasImpact[] = mapBiasLabelsToObjects(biasIndicators);

  const totalBiasInfluence = biasImpact.reduce((sum, b) => sum + b.scoreInfluence, 0);
  const biasAdjustedScore = Math.max(
    0,
    Math.min(10, Math.round((sentimentScore - totalBiasInfluence) * 10) / 10),
  );

  return {
    sentimentScore,
    biasAdjustedScore,
    totalScoreAdjustment: -totalBiasInfluence,
    biasImpact,
    audienceFit: biasImpact.length
      ? 'Best for audiences matching detected biases (e.g., franchise fans, genre enthusiasts).'
      : 'General gaming audience; no strong bias detected.',
    adjustmentRationale: biasImpact.length
      ? `The score was adjusted by ${-totalBiasInfluence > 0 ? '+' : ''}${(-totalBiasInfluence).toFixed(1)} to remove emotional or habitual bias.`
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
  totalScoreAdjustment: number;
} => {
  const biasDetails: BiasDetail[] = mapBiasLabelsToObjects(biasIndicators).map((b) => ({
    name: b.name,
    severity: b.severity,
    scoreImpact: b.scoreInfluence,
    impactOnExperience: b.impactOnExperience,
    description: b.explanation,
  }));

  const totalBiasInfluence = biasDetails.reduce((sum, b) => sum + b.scoreImpact, 0);
  const biasAdjustedScore = Math.max(
    0,
    Math.min(10, Math.round((sentimentScore - totalBiasInfluence) * 10) / 10),
  );
  const totalScoreAdjustment = -totalBiasInfluence;

  const verdict =
    biasAdjustedScore >= 7.5
      ? 'generally positive'
      : biasAdjustedScore >= 5
        ? 'mixed'
        : 'generally negative';

  const confidence =
    biasIndicators.length >= 5 ? 'low' : biasIndicators.length >= 3 ? 'moderate' : 'high';
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
      biasSummary: biasIndicators.length ? `Includes ${biasIndicators.join(', ')}.` : undefined,
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
    totalScoreAdjustment,
  };
};
