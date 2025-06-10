import type {
  BiasImpact,
  BiasAdjustmentOutput,
  BiasSummary,
} from '@scorelytic/shared/utils/biasAdjustment';
import type {
  BiasDetail,
  CulturalContext,
  FullBiasReport,
} from '@scorelytic/shared/types/biasReport';

// === BIAS_HEURISTICS sign convention ===
// Positive scoreInfluence: bias inflated the score (e.g. nostalgia, franchise, hype, platform)
// Negative scoreInfluence: bias deflated the score (e.g. contrarian, fatigue, genre aversion)
// Technical/identity/cultural biases: 0 (no adjustment)
const BIAS_HEURISTICS: Record<
  string,
  {
    severity: 'low' | 'moderate' | 'high';
    scoreInfluence: number;
    impactOnExperience: string;
    explanation: string;
  }
> = {
  'cultural bias': {
    severity: 'moderate',
    scoreInfluence: -0.2,
    impactOnExperience:
      "Cultural preferences or misunderstandings may skew the review's objectivity.",
    explanation:
      "Cultural bias detected; reviewer's background or values may affect their perception of the game.",
  },
  'comparative bias': {
    severity: 'moderate',
    scoreInfluence: -0.3,
    impactOnExperience: 'Comparisons to other titles may skew objective assessment.',
    explanation: 'Comparative bias detected; reviewer may judge unfairly by external standards.',
  },
  'overjustification bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience: 'Reviewer may rationalize enjoyment beyond typical evaluation.',
    explanation: 'Overjustification bias detected; emotional defense may inflate score.',
  },
  'expectation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    impactOnExperience: 'Expectations may cause sentiment drift relative to game quality.',
    explanation:
      'Expectation bias detected; review sentiment reflects preconceptions more than experience.',
  },
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

export const BIAS_KEYWORDS: Record<string, string[]> = {
  'cultural bias': [
    'too japanese',
    'too western',
    'cultural references',
    'lost in translation',
    'doesn’t resonate with me',
    'not my culture',
    'foreign',
    'localization',
    'cultural differences',
    'western audience',
    'japanese audience',
    'cultural expectations',
    'culture clash',
    'religious themes',
    'national identity',
    'regional humor',
    'cultural nuance',
    'cultural context',
    'not relatable',
    'alienating',
    'culturally specific',
    'culture shock',
    'unfamiliar customs',
    'traditional values',
    'modern values',
    'cultural appropriation',
    'stereotypes',
    'cultural insensitivity',
    'cultural authenticity',
  ],
  'comparative bias': [
    'compared to',
    'not as good as',
    'X did it better',
    'unlike',
    'inferior to',
    'better than',
    'falls short of',
    'reminds me of',
    'fails to match',
  ],
  'overjustification bias': [
    "I know it's flawed but",
    'despite the issues',
    'I still loved it anyway',
    'you just have to get used to it',
    'it grows on you',
    'surprisingly fun despite',
  ],
  'expectation bias': [
    'I expected more',
    'it exceeded my expectations',
    'underwhelming',
    'fell short',
    'surprised me',
    'better than expected',
    'lived up to the hype',
    'wasn’t as bad as',
    'hyped up',
    'let down',
    'over-delivered',
  ],
  'nostalgia bias': [
    'nostalgia',
    'nostalgic',
    'retro',
    'throwback',
    'old school',
    'classic',
    'vintage',
    'remember when',
    'back in the day',
    'fond memories',
    'blast from the past',
  ],
  'franchise bias': [
    'franchise',
    'series',
    'sequel',
    'installment',
    'saga',
    'returning fans',
    'loyal to',
    'longtime fan',
    'the previous games',
    'previous titles',
    'continuation',
  ],
  'influencer bias': [
    'influencer',
    'external pressure',
    'sponsored content',
    'paid promotion',
    'partner',
    'affiliate',
    'brand deal',
    'collaboration',
    'advertisement',
    'marketing pressure',
    'shoutout',
    'promo code',
    'brand collab',
    'social media push',
    'affiliate link',
    'sponsored post',
    'endorsement deal',
    'marketing campaign',
    'hype train',
  ],
  'sponsored bias': [
    'sponsored',
    'brand partnership',
    'paid review',
    'advertisement',
    'promotion',
    'partnered with',
    'sponsored by',
    'ad integration',
    'paid endorsement',
    'advertorial',
    'promo deal',
    'brand deal',
    'influencer marketing',
    'product placement',
    'advert',
    'collaboration deal',
    'commercial content',
  ],
  'platform bias': [
    'platform loyalty',
    'console preference',
    'pc master race',
    'exclusive',
    'platform exclusive',
    'xbox fan',
    'playstation fan',
    'nintendo fan',
    'best on ps5',
    'switch version',
    'console war',
    'platform favoritism',
    'system seller',
    'exclusive content',
    'platform-specific',
    'device loyalty',
    'fanboy',
    'fangirl',
    'native version',
  ],
  'studio reputation bias': [
    'studio reputation',
    'developer goodwill',
    'goodwill',
    'developer known for',
    'reliable developer',
    'trusted studio',
    'famous developer',
    'reputation precedes',
  ],
  'contrarian bias': [
    'contrarian',
    'against the grain',
    'unpopular opinion',
    'going against',
    'disagree',
    'not a fan',
    'not impressed',
    'critical stance',
    'negative spin',
  ],
  'genre aversion': [
    'hate',
    'dislike',
    'not a fan of',
    'genre aversion',
    'not into',
    'not my thing',
    'bored by',
    'tired of',
    "doesn't appeal to me",
    'genre fatigue',
  ],
  'reviewer fatigue': [
    'burnout',
    'fatigue',
    'tired',
    'exhausted',
    'overplayed',
    'reviewer fatigue',
    'fed up',
    'played too much',
    'lack of enthusiasm',
  ],
  'technical criticism': [
    'technical issues',
    'bugs',
    'glitches',
    'performance problems',
    'crashes',
    'lag',
    'frame drops',
    'technical flaws',
    'broken mechanics',
    'optimization issues',
    'glitchy',
    'unstable build',
    'fps drops',
    'server issues',
    'patch problems',
    'bug-ridden',
    'crash-prone',
    'lag spikes',
    'buggy',
  ],
  'accessibility bias': [
    'accessible',
    'accessibility options',
    'inclusive design',
    'easy to pick up',
    'difficulty settings',
    'accessible for all',
    'adaptive controls',
  ],
  'story-driven bias': [
    'story-driven',
    'narrative',
    'plot',
    'characters',
    'dialogue',
    'emotional story',
    'strong narrative',
    'storytelling',
    'cinematic',
    'script',
  ],
  'identity signaling bias': [
    'identity',
    'representation',
    'culture',
    'diversity',
    'inclusivity',
    'LGBTQ+',
    'gender',
    'racial themes',
    'cultural alignment',
    'political message',
    'social justice',
  ],
  'representation bias': [
    'diversity',
    'inclusive',
    'representation',
    'minorities',
    'gender balance',
    'multicultural',
    'inclusion',
    'equity',
    'representation matters',
  ],
  'narrative framing bias': [
    'current events',
    'political',
    'ideology',
    'sociopolitical themes',
    'framing',
    'agenda',
    'social commentary',
    'cultural context',
  ],
  'hype bias': [
    'hype',
    'marketing',
    'pre-release excitement',
    'buzz',
    'anticipation',
    'community excitement',
    'launch hype',
    'overhyped',
    'high expectations',
    'hype train',
    'overhype',
    'bandwagon',
    'hype cycle',
    'pre-launch buzz',
    'inflated expectations',
    'marketing blitz',
    'social media hype',
    'viral marketing',
  ],
  'recency bias': [
    'new release',
    'fresh',
    'recently released',
    'latest title',
    'cutting edge',
    'modern',
    'up-to-date',
    'newness',
  ],
  'difficulty bias': [
    'difficulty',
    'hard',
    'easy',
    'challenging',
    'too hard',
    'too easy',
    'difficulty settings',
    'grindy',
    'casual player',
    'hardcore gamer',
  ],
  'graphics bias': [
    'graphics',
    'visual fidelity',
    'art style',
    'beautiful',
    'stunning visuals',
    'pixel perfect',
    'graphics quality',
    'visuals',
  ],
  'multiplayer bias': [
    'multiplayer',
    'co-op',
    'online play',
    'competitive',
    'pvp',
    'team-based',
    'solo play',
    'multiplayer experience',
    'community mode',
  ],
  'price bias': [
    'price',
    'cost',
    'value for money',
    'expensive',
    'cheap',
    'pay-to-win',
    'microtransactions',
    'pricing model',
    'free-to-play',
  ],
};

export const mapBiasLabelsToObjects = (
  biasLabels: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
): BiasImpact[] => {
  return biasLabels.map((label) => {
    const heur = BIAS_HEURISTICS[label] || {
      severity: 'low',
      scoreInfluence: 0,
      impactOnExperience: 'Unknown',
      explanation: 'No specific heuristic.',
    };
    // Gather all text sources
    const allText = [reviewSummary, ...pros, ...cons].join(' ').toLowerCase();
    const keywords = (BIAS_KEYWORDS[label] || []).map((k) => k.toLowerCase());
    // Evidence: collect all matching phrases
    let evidence: string[] = [];
    keywords.forEach((kw) => {
      if (reviewSummary.toLowerCase().includes(kw)) evidence.push(kw);
      pros.forEach((p) => {
        if (p.toLowerCase().includes(kw)) evidence.push(kw);
      });
      cons.forEach((c) => {
        if (c.toLowerCase().includes(kw)) evidence.push(kw);
      });
    });
    // Unique evidence
    let uniqueEvidence = Array.from(new Set(evidence));
    // If no evidence, try to find any bias keyword in the text as fallback
    if (uniqueEvidence.length === 0) {
      for (const kw of keywords) {
        if (allText.includes(kw)) {
          uniqueEvidence = [kw];
          break;
        }
      }
    }
    // If still no evidence, set a default
    if (uniqueEvidence.length === 0) {
      uniqueEvidence = ['(no explicit evidence found)'];
    }
    // Keyword hits
    const keywordHits =
      uniqueEvidence.length && uniqueEvidence[0] !== '(no explicit evidence found)'
        ? uniqueEvidence.length
        : 0;
    // DetectedIn logic
    const detectedIn: string[] = [];
    if (pros.some((p) => keywords.some((kw) => p.toLowerCase().includes(kw))))
      detectedIn.push('phrasing');
    if (cons.some((c) => keywords.some((kw) => c.toLowerCase().includes(kw))))
      detectedIn.push('phrasing');
    if (reviewSummary && keywords.some((kw) => reviewSummary.toLowerCase().includes(kw)))
      detectedIn.push('tone');
    // Reviewer intent
    let reviewerIntent: 'explicit' | 'implied' | 'unclear' = 'unclear';
    if (
      uniqueEvidence.some((e) =>
        ['explicitly', 'clearly', 'directly'].some((w) => allText.includes(w + ' ' + e)),
      )
    ) {
      reviewerIntent = 'explicit';
    } else if (uniqueEvidence.length > 0 && uniqueEvidence[0] !== '(no explicit evidence found)') {
      reviewerIntent = 'implied';
    }
    // Confidence
    let confidenceScore = calculateBiasConfidenceScore(keywordHits, detectedIn, reviewerIntent);
    if (confidenceScore === 0) confidenceScore = 0.5;
    // Adjusted influence
    const adjustedInfluence = heur.scoreInfluence * confidenceScore;
    return {
      name: label,
      severity: heur.severity,
      scoreInfluence: heur.scoreInfluence,
      impactOnExperience: heur.impactOnExperience,
      explanation: heur.explanation,
      confidenceScore,
      adjustedInfluence,
      detectedIn,
      reviewerIntent,
      evidence: uniqueEvidence,
    };
  });
};

export const evaluateBiasImpact = (
  sentimentScore: number,
  biasIndicators: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
): BiasAdjustmentOutput => {
  const biasImpact: BiasImpact[] = mapBiasLabelsToObjects(
    biasIndicators,
    reviewSummary,
    pros,
    cons,
  );

  const totalBiasInfluence = biasImpact.reduce((sum, b) => sum + b.adjustedInfluence, 0);
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
      ? `The score was adjusted by ${-totalBiasInfluence > 0 ? '+' : ''}${(-totalBiasInfluence).toFixed(2)} to remove emotional or habitual bias.`
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

/**
 * Calculate a confidence score for a detected bias.
 * @param keywordHits Number of keyword matches
 * @param detectedIn Array of detection sources (e.g., ['tone', 'phrasing'])
 * @param reviewerIntent 'explicit' | 'implied' | 'unclear'
 * @returns Confidence score between 0 and 1
 */
export const calculateBiasConfidenceScore = (
  keywordHits: number,
  detectedIn: string[],
  reviewerIntent: 'explicit' | 'implied' | 'unclear',
): number => {
  let score = 0;
  if (keywordHits >= 3) score += 0.4;
  else if (keywordHits === 2) score += 0.3;
  else if (keywordHits === 1) score += 0.2;
  if (detectedIn.includes('tone')) score += 0.1;
  if (detectedIn.includes('phrasing')) score += 0.1;
  if (reviewerIntent === 'explicit') score += 0.3;
  else if (reviewerIntent === 'implied') score += 0.2;
  else if (reviewerIntent === 'unclear') score += 0.1;
  return Math.min(1, score);
};

// Example BiasImpact object for 'genre aversion':
// {
//   name: 'genre aversion',
//   severity: 'moderate',
//   scoreInfluence: -0.3,
//   confidenceScore: 0.8,
//   adjustedInfluence: -0.24,
//   detectedIn: ['tone', 'phrasing'],
//   reviewerIntent: 'implied',
//   evidence: [
//     'Favoring memorization over swift thinking...',
//     'Combat starts to feel routine...'
//   ],
//   impactOnExperience: 'Personal genre preferences may deflate the score.',
//   explanation: 'Genre aversion detected; personal dislike may skew perception.'
// }
