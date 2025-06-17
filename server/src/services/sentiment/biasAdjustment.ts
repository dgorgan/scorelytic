import type {
  BiasDetail,
  legacyAndInfluence,
  FullBiasReport,
  BiasImpact,
  BiasAdjustmentOutput,
  BiasSummary,
  BiasInteractionEffect,
} from '@scorelytic/shared/types/biasReport';
import logger from '@/logger';

// === BIAS_HEURISTICS sign convention ===
// Positive scoreInfluence: bias inflated the score (e.g. nostalgia, franchise, hype, platform)
// Negative scoreInfluence: bias deflated the score (e.g. contrarian, fatigue, genre aversion)
const BIAS_HEURISTICS: Record<
  string,
  {
    severity: 'low' | 'moderate' | 'high';
    scoreInfluence: number;
    baseScoreInfluence: number;
    maxScoreInfluence: number;
    impactOnExperience: string;
    explanation: string;
  }
> = {
  'cultural bias': {
    severity: 'moderate',
    scoreInfluence: -0.2,
    baseScoreInfluence: -0.2,
    maxScoreInfluence: -0.2,
    impactOnExperience:
      "Cultural preferences or misunderstandings may skew the review's objectivity.",
    explanation:
      "Cultural bias detected; reviewer's background or values may affect their perception of the game.",
  },
  'comparative bias': {
    severity: 'moderate',
    scoreInfluence: -0.3,
    baseScoreInfluence: -0.3,
    maxScoreInfluence: -0.3,
    impactOnExperience: 'Comparisons to other titles may skew objective assessment.',
    explanation: 'Comparative bias detected; reviewer may judge unfairly by external standards.',
  },
  'overjustification bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.3,
    impactOnExperience: 'Reviewer may rationalize enjoyment beyond typical evaluation.',
    explanation: 'Overjustification bias detected; emotional defense may inflate score.',
  },
  'expectation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.39,
    impactOnExperience: 'Expectations may cause sentiment drift relative to game quality.',
    explanation:
      'Expectation bias detected; review sentiment reflects preconceptions more than experience.',
  },
  'nostalgia bias': {
    severity: 'moderate',
    scoreInfluence: 0.5,
    baseScoreInfluence: 0.5,
    maxScoreInfluence: 0.75,
    impactOnExperience:
      "Nostalgia may inflate the reviewer's score beyond the game's objective merits.",
    explanation:
      'Nostalgia bias detected; reviewer may rate higher due to fondness for the franchise.',
  },
  'franchise bias': {
    severity: 'low',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.42,
    impactOnExperience: 'Franchise loyalty may increase the score.',
    explanation: 'Franchise bias detected; loyalty to the series may inflate the score.',
  },
  'influencer bias': {
    severity: 'high',
    scoreInfluence: 0.6,
    baseScoreInfluence: 0.6,
    maxScoreInfluence: 0.84,
    impactOnExperience: 'Possible positive skew due to external incentives.',
    explanation: 'Influencer bias detected; possible inflated score from external pressure.',
  },
  'sponsored bias': {
    severity: 'high',
    scoreInfluence: 0.7,
    baseScoreInfluence: 0.7,
    maxScoreInfluence: 0.98,
    impactOnExperience: 'Possible positive skew due to sponsorship.',
    explanation: 'Sponsored bias detected; score may reflect brand partnership influence.',
  },
  'platform bias': {
    severity: 'moderate',
    scoreInfluence: 0.2,
    baseScoreInfluence: 0.2,
    maxScoreInfluence: 0.24,
    impactOnExperience: 'Platform loyalty may inflate the score.',
    explanation: 'Platform bias detected; platform preference may affect objectivity.',
  },
  'studio reputation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.39,
    impactOnExperience: 'Studio reputation may inflate expectations and perceived quality.',
    explanation: 'Studio reputation bias detected; goodwill toward developer may boost score.',
  },
  'contrarian bias': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    baseScoreInfluence: -0.4,
    maxScoreInfluence: -0.52,
    impactOnExperience: 'Contrarian stance may deflate the score below consensus.',
    explanation: 'Contrarian bias detected; reviewer may underrate to go against the grain.',
  },
  'genre aversion': {
    severity: 'moderate',
    scoreInfluence: -0.3,
    baseScoreInfluence: -0.3,
    maxScoreInfluence: -0.36,
    impactOnExperience: 'Personal genre preferences may deflate the score.',
    explanation: 'Genre aversion detected; personal dislike may skew perception.',
  },
  'reviewer fatigue': {
    severity: 'moderate',
    scoreInfluence: -0.4,
    baseScoreInfluence: -0.4,
    maxScoreInfluence: -0.52,
    impactOnExperience: 'Fatigue may lead to harsher criticism or lack of enthusiasm.',
    explanation: 'Reviewer fatigue detected; burnout may reduce generosity of evaluation.',
  },
  'technical criticism': {
    severity: 'low',
    scoreInfluence: -0.2,
    baseScoreInfluence: -0.2,
    maxScoreInfluence: -0.26,
    impactOnExperience: 'Focus on technical flaws may overshadow other aspects.',
    explanation: 'Technical criticism bias detected; nitpicking may lower score.',
  },
  'accessibility bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    baseScoreInfluence: 0.1,
    maxScoreInfluence: 0.1,
    impactOnExperience: 'Accessibility focus may affect overall impression.',
    explanation: 'Accessibility bias detected; inclusive features may positively influence score.',
  },
  'story-driven bias': {
    severity: 'low',
    scoreInfluence: 0.2,
    baseScoreInfluence: 0.2,
    maxScoreInfluence: 0.26,
    impactOnExperience: 'Preference for story-driven games may affect evaluation.',
    explanation:
      'Story-driven bias detected; strong narrative may disproportionately influence score.',
  },
  'identity signaling bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.42,
    impactOnExperience:
      'Identity themes may enhance emotional connection, but may also overshadow objective assessment.',
    explanation:
      'Identity signaling bias detected; score may reflect cultural alignment more than gameplay.',
  },
  'representation bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.42,
    impactOnExperience:
      'Strong emphasis on diversity and inclusion may affect perception of quality, even if unrelated to gameplay.',
    explanation: 'Representation bias detected; inclusivity focus may skew score upward.',
  },
  'narrative framing bias': {
    severity: 'high',
    scoreInfluence: 0.4,
    baseScoreInfluence: 0.4,
    maxScoreInfluence: 0.52,
    impactOnExperience: 'Themes tied to current events or ideology may inflate reviewer sentiment.',
    explanation:
      'Narrative framing bias detected; reviewer may rate higher due to resonance with sociopolitical themes.',
  },
  'hype bias': {
    severity: 'high',
    scoreInfluence: 0.5,
    baseScoreInfluence: 0.5,
    maxScoreInfluence: 0.7,
    impactOnExperience: "Pre-release hype or marketing may inflate the reviewer's score.",
    explanation:
      'Hype bias detected; reviewer may be influenced by marketing or community excitement.',
  },
  'recency bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.36,
    impactOnExperience: 'Recent releases may be rated higher due to novelty.',
    explanation: 'Recency bias detected; newness may inflate the score.',
  },
  'difficulty bias': {
    severity: 'low',
    scoreInfluence: -0.2,
    baseScoreInfluence: -0.2,
    maxScoreInfluence: -0.24,
    impactOnExperience: "Reviewer's preference for or against difficulty may affect score.",
    explanation: 'Difficulty bias detected; difficulty level may skew enjoyment.',
  },
  'graphics bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    baseScoreInfluence: 0.1,
    maxScoreInfluence: 0.14,
    impactOnExperience: 'Visual fidelity may disproportionately affect the score.',
    explanation: 'Graphics bias detected; visuals may overly influence perception.',
  },
  'multiplayer bias': {
    severity: 'low',
    scoreInfluence: 0.1,
    baseScoreInfluence: 0.1,
    maxScoreInfluence: 0.12,
    impactOnExperience: 'Preference for or against multiplayer may affect evaluation.',
    explanation: 'Multiplayer bias detected; co-op/competitive leanings may affect impression.',
  },
  'price bias': {
    severity: 'low',
    scoreInfluence: -0.1,
    baseScoreInfluence: -0.1,
    maxScoreInfluence: -0.12,
    impactOnExperience: 'Perceived value or price may affect the score.',
    explanation: 'Price bias detected; pricing model may deflate or inflate score.',
  },
  'reciprocity bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.39,
    impactOnExperience:
      'Gifts, perks, or personal goodwill may inflate score without relevance to actual game quality.',
    explanation:
      'Reciprocity bias detected; reviewer may feel unconsciously compelled to speak positively due to favors received.',
  },

  'availability bias': {
    severity: 'moderate',
    scoreInfluence: 0.2,
    baseScoreInfluence: 0.2,
    maxScoreInfluence: 0.24,
    impactOnExperience:
      'Highly memorable or vivid experiences may dominate judgment, overshadowing the full picture.',
    explanation:
      'Availability bias detected; reviewer may fixate on standout moments rather than overall consistency.',
  },

  'halo effect': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.42,
    impactOnExperience:
      'Positive impressions in one area (e.g. graphics, soundtrack) may inflate assessment of unrelated aspects.',
    explanation:
      'Halo effect detected; isolated strengths may create a falsely elevated perception of overall quality.',
  },

  'horn effect': {
    severity: 'moderate',
    scoreInfluence: -0.3,
    baseScoreInfluence: -0.3,
    maxScoreInfluence: -0.39,
    impactOnExperience:
      'One major flaw may cause the reviewer to underrate otherwise solid elements.',
    explanation:
      'Horn effect detected; frustration with specific issues may unfairly lower overall evaluation.',
  },

  'selection bias': {
    severity: 'moderate',
    scoreInfluence: -0.2,
    baseScoreInfluence: -0.2,
    maxScoreInfluence: -0.24,
    impactOnExperience:
      'Review may reflect only part of the experience if the reviewer avoided certain modes or content.',
    explanation: 'Selection bias detected; partial gameplay exposure may skew objectivity.',
  },

  'confirmation bias': {
    severity: 'moderate',
    scoreInfluence: -0.2,
    baseScoreInfluence: -0.2,
    maxScoreInfluence: -0.26,
    impactOnExperience:
      'Reviewer may unconsciously emphasize details that match their expectations or prior beliefs.',
    explanation:
      'Confirmation bias detected; reviewer selectively interprets evidence that aligns with their assumptions.',
  },

  'bandwagon bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.42,
    impactOnExperience: 'Popular opinion or social media discourse may skew individual judgment.',
    explanation:
      'Bandwagon bias detected; reviewer sentiment may be shaped by community consensus rather than personal analysis.',
  },

  'survivorship bias': {
    severity: 'moderate',
    scoreInfluence: 0.2,
    baseScoreInfluence: 0.2,
    maxScoreInfluence: 0.24,
    impactOnExperience:
      'Reviewer may overlook flaws by focusing on only the standout or polished features.',
    explanation:
      'Survivorship bias detected; only the best aspects of the game are being weighed, ignoring flaws or incomplete features.',
  },

  'emotional bias': {
    severity: 'moderate',
    scoreInfluence: 0.3,
    baseScoreInfluence: 0.3,
    maxScoreInfluence: 0.39,
    impactOnExperience:
      'Strong emotional reactions (joy, anger, nostalgia) may skew objectivity, especially in tone and scoring.',
    explanation:
      'Emotional bias detected; the tone suggests heightened feelings that may distort fair analysis.',
  },

  sarcasm: {
    severity: 'low',
    scoreInfluence: 0.0, // Flag only - no score adjustment
    baseScoreInfluence: 0.0,
    maxScoreInfluence: 0.0,
    impactOnExperience:
      'Sarcastic tone may flip apparent sentiment, requiring careful interpretation of actual opinion.',
    explanation:
      'Sarcasm detected; review uses ironic or mocking tone that may not reflect genuine sentiment.',
  },
};

export const BIAS_KEYWORDS: Record<string, string[]> = {
  'cultural bias': [
    'too japanese',
    'too western',
    'cultural references',
    'lost in translation',
    "doesn't resonate with me",
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
    'legacy & influence',
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
    "wasn't as bad as",
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
    'legacy & influence',
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
  'reciprocity bias': [
    'generously gave me access',
    'got to preview',
    'gifted copy',
    'special treatment',
    'free copy',
    'was nice enough to send',
    'early access provided by',
    'review copy received',
    'generous devs',
    'grateful for the opportunity',
  ],
  'availability bias': [
    'what sticks out',
    'I keep thinking about',
    'the moment I remember most',
    'what sticks with me',
    'most memorable',
    'stood out',
    "can't stop thinking about",
    'the part I remember most',
  ],
  'halo effect': [
    'because of the art',
    'due to the soundtrack',
    'everything feels great',
    'beautiful art and everything else just works',
    'soundtrack alone makes it worth it',
    'gorgeous visuals carried the whole thing',
  ],
  'horn effect': [
    'that one issue ruined it',
    'hard to enjoy anything else',
    'overshadowed',
    'just one bug ruined it',
    'that one issue killed my enjoyment',
    'everything fell apart after',
  ],
  'selection bias': [
    'I only played',
    "didn't touch the campaign",
    'focused on one mode',
    "I didn\'t try multiplayer",
    'mostly stuck to campaign',
    'only played on easy',
    "didn't finish",
  ],
  'confirmation bias': ['exactly what I thought', 'knew it would suck', 'as expected'],
  'bandwagon bias': ["everyone's saying", 'the internet hates it', 'Reddit loves this'],
  'survivorship bias': [
    "after a few patches it's fine",
    'you forget the bad',
    'just focus on what works',
    'classic that still holds up',
    'still enjoyable after years',
    'legacy and influence',
  ],
  'emotional bias': ['so frustrating', 'absolutely furious', 'completely hooked', 'pure joy'],
  sarcasm: [
    'obviously',
    'clearly',
    'brilliant',
    'genius',
    'masterpiece',
    'perfect',
    'flawless',
    'amazing',
    'incredible',
    'spectacular',
    'revolutionary',
    'groundbreaking',
    'innovative',
    'cutting edge',
    'state of the art',
    'next level',
    'game changing',
    'mind blowing',
    'absolutely',
    'totally',
    'definitely',
    'certainly',
    'surely',
    'of course',
    'naturally',
  ],
};

/**
 * Interaction multipliers for bias pairs
 */
const BIAS_INTERACTIONS: Record<string, Record<string, number>> = {
  'nostalgia bias': {
    'franchise bias': 1.5,
    'story-driven bias': 1.3,
    'graphics bias': 1.2,
    'hype bias': 1.3,
  },
  'franchise bias': {
    'studio reputation bias': 1.3,
    'recency bias': 1.2,
    'nostalgia bias': 1.4,
    'genre aversion': 0.8,
  },
  'reviewer fatigue': {
    'contrarian bias': 1.3,
    'genre aversion': 1.2,
    'expectation bias': 0.9,
  },
  'contrarian bias': {
    'horn effect': 1.2,
    'hype bias': 0.8,
  },
  'hype bias': {
    'expectation bias': 1.3,
    'recency bias': 1.2,
    'bandwagon bias': 1.4,
    'nostalgia bias': 1.3,
  },
  'identity signaling bias': {
    'representation bias': 1.4,
    'narrative framing bias': 1.3,
    'confirmation bias': 1.3,
  },
  'representation bias': {
    'emotional bias': 1.3,
  },
  'platform bias': {
    'studio reputation bias': 1.2,
    'multiplayer bias': 1.2,
  },
  'halo effect': {
    'graphics bias': 1.4,
    soundtrack: 1.3,
    'horn effect': 0.8,
  },
  'horn effect': {
    'technical criticism': 1.3,
    'difficulty bias': 1.2,
    'halo effect': 0.8,
  },
  'emotional bias': {
    'nostalgia bias': 1.2,
    'story-driven bias': 1.3,
    'technical criticism': 0.9,
  },
  'confirmation bias': {
    'expectation bias': 1.2,
  },
  'availability bias': {
    'survivorship bias': 1.2,
    'bandwagon bias': 1.1,
  },
  'story-driven bias': {
    'narrative framing bias': 1.2,
  },
  'influencer bias': {
    'sponsored bias': 1.4,
  },
  'price bias': {
    'reciprocity bias': 1.2,
  },
  'reciprocity bias': {
    'sponsored bias': 1.3,
  },
  'bandwagon bias': {
    'confirmation bias': 1.1,
  },
  'survivorship bias': {
    'selection bias': 1.2,
  },
};

export const negationWords = ['not', 'never', "don't", "didn't", "isn't"];

function symmetrizeInteractions(
  interactions: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const symmetrized: Record<string, Record<string, number>> = {};

  for (const [biasA, targets] of Object.entries(interactions)) {
    if (!symmetrized[biasA]) symmetrized[biasA] = {};

    for (const [biasB, multiplier] of Object.entries(targets)) {
      symmetrized[biasA][biasB] = multiplier;

      if (!symmetrized[biasB]) symmetrized[biasB] = {};
      if (!(biasA in symmetrized[biasB])) {
        symmetrized[biasB][biasA] = multiplier;
      }
    }
  }

  return symmetrized;
}

const SYMMETRIC_BIAS_INTERACTIONS = symmetrizeInteractions(BIAS_INTERACTIONS);

/**
 * Check if a keyword is negated in context within the given text
 */
const isNegated = (text: string, keyword: string): boolean => {
  const keywordIndex = text.indexOf(keyword);
  if (keywordIndex === -1) return false;
  const windowStart = Math.max(0, keywordIndex - 10); // 10 chars before keyword
  const context = text.slice(windowStart, keywordIndex).toLowerCase();
  return negationWords.some((neg) => context.includes(neg));
};

/**
 * Calculate proximity score between bias keywords and sentiment words
 * Returns 0-1 score based on how close keywords are to sentiment expressions
 */
const calculateProximityScore = (
  text: string,
  keywords: string[],
  sentimentWords: string[] = [
    'good',
    'bad',
    'love',
    'hate',
    'great',
    'terrible',
    'awesome',
    'awful',
  ],
  maxDistance: number = 10, // words distance
): number => {
  const words = text.toLowerCase().split(/\s+/);
  let minDistance = Infinity;

  const keywordPositions = new Set<number>();
  const sentimentPositions = new Set<number>();

  keywords.forEach((kw) => {
    words.forEach((w, i) => {
      if (w.includes(kw)) keywordPositions.add(i);
    });
  });
  sentimentWords.forEach((sw) => {
    words.forEach((w, i) => {
      if (w.includes(sw)) sentimentPositions.add(i);
    });
  });

  if (keywordPositions.size === 0 || sentimentPositions.size === 0) return 0;

  for (const kPos of keywordPositions) {
    for (const sPos of sentimentPositions) {
      const dist = Math.abs(kPos - sPos);
      if (dist < minDistance) minDistance = dist;
    }
  }

  if (minDistance <= maxDistance) {
    // Closer means higher score, linear decay
    return (maxDistance - minDistance) / maxDistance;
  }
  return 0;
};

/**
 * Map bias labels to detailed objects, enhanced with:
 * - Negation detection
 * - Frequency count
 * - Proximity scoring
 * - Dynamic score influence scaling
 */
export const mapBiasLabelsToObjects = (
  biasLabels: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
  nlpConfidenceMap: Record<string, number> = {}, // optional NLP confidence per bias
): BiasImpact[] => {
  logger.info(`[BIAS] mapBiasLabelsToObjects called with labels: ${JSON.stringify(biasLabels)}`);

  const allText = [reviewSummary, ...pros, ...cons].join(' ').toLowerCase();

  const sentimentWords = ['good', 'bad', 'love', 'hate', 'great', 'terrible', 'awesome', 'awful'];

  const result = biasLabels.map((label) => {
    const heur = BIAS_HEURISTICS[label] || {
      severity: 'low',
      baseScoreInfluence: 0,
      maxScoreInfluence: 0,
      impactOnExperience: 'Unknown',
      explanation: 'No specific heuristic.',
    };

    const keywords = (BIAS_KEYWORDS[label] || []).map((k) => k.toLowerCase());

    // Evidence collection with negation filtering
    let evidence: string[] = [];

    const addEvidenceIfNotNegated = (textSource: string) => {
      keywords.forEach((kw) => {
        if (textSource.includes(kw) && !isNegated(textSource, kw)) {
          evidence.push(kw);
        }
      });
    };

    addEvidenceIfNotNegated(reviewSummary.toLowerCase());
    pros.forEach((p) => addEvidenceIfNotNegated(p.toLowerCase()));
    cons.forEach((c) => addEvidenceIfNotNegated(c.toLowerCase()));

    // Unique evidence
    let uniqueEvidence = Array.from(new Set(evidence));

    // Fallback: check for any keyword ignoring negation (for fallback only)
    if (uniqueEvidence.length === 0) {
      for (const kw of keywords) {
        if (allText.includes(kw)) {
          uniqueEvidence = [kw];
          break;
        }
      }
    }

    if (uniqueEvidence.length === 0) {
      uniqueEvidence = ['(no explicit evidence found)'];
    }

    // Keyword hits and frequency count (including duplicates)
    const keywordHits =
      uniqueEvidence[0] === '(no explicit evidence found)' ? 0 : uniqueEvidence.length;
    const keywordFrequency = evidence.length;

    // DetectedIn: tone or phrasing (pros/cons)
    const detectedIn: string[] = [];
    if (pros.some((p) => keywords.some((kw) => p.toLowerCase().includes(kw))))
      detectedIn.push('phrasing');
    if (cons.some((c) => keywords.some((kw) => c.toLowerCase().includes(kw))))
      detectedIn.push('phrasing');
    if (reviewSummary && keywords.some((kw) => reviewSummary.toLowerCase().includes(kw)))
      detectedIn.push('tone');

    // Reviewer intent detection (explicit, implied, unclear)
    let reviewerIntent: 'explicit' | 'implied' | 'unclear' = 'unclear';
    if (
      uniqueEvidence.some((e) =>
        ['explicitly', 'clearly', 'directly'].some((w) => allText.includes(w + ' ' + e)),
      )
    ) {
      reviewerIntent = 'explicit';
    } else if (keywordHits > 0) {
      reviewerIntent = 'implied';
    }

    // Sentiment proximity score for evidence keywords to sentiment words
    const sentimentProximityScore = calculateProximityScore(allText, keywords, sentimentWords);

    // Get NLP confidence if available
    const nlpConfidence = nlpConfidenceMap[label] || 0;

    // Calculate confidence score
    const confidenceScore = calculateBiasConfidenceScore(
      keywordHits,
      detectedIn,
      reviewerIntent,
      nlpConfidence,
      keywordFrequency,
      sentimentProximityScore,
    );

    // Score influence scaling by frequency modifier (normalize hits count)
    const freqModifier = Math.min(1, keywordHits / 5);
    const baseInfluence = heur.baseScoreInfluence || 0;
    const maxInfluence = heur.maxScoreInfluence ?? baseInfluence;
    const scaledInfluence = baseInfluence + freqModifier * (maxInfluence - baseInfluence);

    const adjustedInfluence = scaledInfluence * confidenceScore;

    return {
      name: label,
      severity: heur.severity,
      baseScoreInfluence: heur.baseScoreInfluence ?? 0,
      maxScoreInfluence: heur.maxScoreInfluence ?? heur.baseScoreInfluence ?? 0,
      impactOnExperience: heur.impactOnExperience,
      explanation: heur.explanation,
      confidenceScore,
      adjustedInfluence,
      detectedIn,
      reviewerIntent,
      evidence: uniqueEvidence,
    };
  });

  logger.info(`[BIAS] mapBiasLabelsToObjects result: ${JSON.stringify(result)}`);

  return result;
};

/**
 * Evaluate bias impact, incorporating bias interactions and improved aggregation
 */
export const evaluateBiasImpact = (
  sentimentScore: number,
  biasIndicators: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
  nlpConfidenceMap: Record<string, number> = {},
): BiasAdjustmentOutput & { biasInteractionsApplied: BiasInteractionEffect[] } => {
  logger.info(
    `[BIAS] evaluateBiasImpact called with score: ${sentimentScore}, indicators: ${JSON.stringify(
      biasIndicators,
    )}`,
  );

  const biasImpact: BiasImpact[] = mapBiasLabelsToObjects(
    biasIndicators,
    reviewSummary,
    pros,
    cons,
    nlpConfidenceMap,
  );

  // Sum of individual adjusted influences
  let totalBiasInfluence = biasImpact.reduce((sum, b) => sum + b.adjustedInfluence, 0);

  // Track applied bias interactions for reporting
  const biasInteractionsApplied: BiasInteractionEffect[] = [];

  // Apply bias interaction multipliers
  for (let i = 0; i < biasImpact.length; i++) {
    for (let j = i + 1; j < biasImpact.length; j++) {
      const biasA = biasImpact[i].name;
      const biasB = biasImpact[j].name;

      const multiplier = SYMMETRIC_BIAS_INTERACTIONS[biasA]?.[biasB];
      if (multiplier) {
        const combinedInfluence = biasImpact[i].adjustedInfluence + biasImpact[j].adjustedInfluence;
        const addedInfluence = combinedInfluence * (multiplier - 1);
        totalBiasInfluence += addedInfluence;

        biasInteractionsApplied.push({
          biases: [biasA, biasB],
          multiplier,
          influenceAdded: addedInfluence,
        });
      }
    }
  }

  // Clamp adjusted score between 0 and 10, rounded to one decimal place
  const biasAdjustedScore = Math.max(
    0,
    Math.min(10, Math.round((sentimentScore - totalBiasInfluence) * 10) / 10),
  );

  logger.info(`[BIAS] evaluateBiasImpact biasImpact: ${JSON.stringify(biasImpact)}`);

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

  const playerFit = {
    aligned: 'positive',
    neutral: 'mixed',
    opposed: 'negative',
  };
  logger.info(
    `[BIAS] verdict: ${verdict}, confidence: ${confidence}, recommendationStrength: ${recommendationStrength}, playerFit: ${JSON.stringify(
      playerFit,
    )}`,
  );

  logger.info(
    `[BIAS] evaluateBiasImpact output: ${JSON.stringify({
      sentimentScore,
      biasAdjustedScore,
      totalScoreAdjustment,
      biasImpact,
      biasInteractionsApplied,
    })}`,
  );

  return {
    sentimentScore,
    biasAdjustedScore,
    totalScoreAdjustment,
    biasImpact,
    biasInteractionsApplied, // <-- added here for full interaction tracking
    audienceFit: biasImpact.length
      ? 'Best for audiences matching detected biases (e.g., franchise fans, genre enthusiasts).'
      : 'General gaming audience; no strong bias detected.',
    adjustmentRationale: biasImpact.length
      ? `The score was adjusted by ${
          -totalScoreAdjustment > 0 ? '+' : ''
        }${(-totalScoreAdjustment).toFixed(2)} to remove emotional or habitual bias.`
      : 'No significant biases detected; score reflects general sentiment.',
  };
};

/**
 * Generate a bias report with combined influence scores,
 * taking into account individual bias scores and their interactions.
 *
 * @param detectedBiases List of detected bias keys
 * @returns Report object or string with combined bias impact
 */
export const generateBiasReport = (
  sentimentScore: number,
  biasIndicators: string[],
  reviewSummary: string = '',
  pros: string[] = [],
  cons: string[] = [],
  nlpConfidenceMap: Record<string, number> = {},
): {
  summary: BiasSummary;
  details: BiasDetail[];
  legacyAndInfluence: legacyAndInfluence;
  fullReport: FullBiasReport;
  totalScoreAdjustment: number;
} => {
  logger.info(
    `[BIAS] generateBiasReport called with score: ${sentimentScore}, indicators: ${JSON.stringify(biasIndicators)}`,
  );

  const impact = evaluateBiasImpact(
    sentimentScore,
    biasIndicators,
    reviewSummary,
    pros,
    cons,
    nlpConfidenceMap,
  );

  const biasDetails: BiasDetail[] = impact.biasImpact.map((b) => ({
    name: b.name,
    severity: b.severity,
    adjustedInfluence: b.adjustedInfluence ?? 0,
    baseScoreInfluence: b.baseScoreInfluence ?? 0,
    maxScoreInfluence: b.maxScoreInfluence ?? b.baseScoreInfluence ?? 0,
    impactOnExperience: b.impactOnExperience,
    explanation: b.explanation,
    confidenceScore: b.confidenceScore,
    detectedIn: b.detectedIn,
    reviewerIntent: b.reviewerIntent,
    evidence: b.evidence,
    biasInteractionsApplied: impact.biasInteractionsApplied,
  }));

  const verdict =
    impact.biasAdjustedScore >= 7.5
      ? 'generally positive'
      : impact.biasAdjustedScore >= 5
        ? 'mixed'
        : 'generally negative';

  const confidence =
    biasIndicators.length >= 5 ? 'low' : biasIndicators.length >= 3 ? 'moderate' : 'high';

  const recommendationStrength =
    impact.biasAdjustedScore >= 8 ? 'strong' : impact.biasAdjustedScore >= 6 ? 'moderate' : 'weak';

  const playerFit = {
    aligned: 'positive',
    neutral: 'mixed',
    opposed: 'negative',
  };

  const summary: BiasSummary = {
    adjustedScore: impact.biasAdjustedScore,
    verdict,
    confidence,
    recommendationStrength,
    biasSummary: biasIndicators.length ? `Includes ${biasIndicators.join(', ')}.` : undefined,
  };

  const legacyAndInfluence: legacyAndInfluence = {
    originalScore: sentimentScore,
    biasAdjustedScore: impact.biasAdjustedScore,
    justification: biasIndicators.length
      ? 'Score adjusted to reflect detected ideological, narrative, or identity-related influences.'
      : 'No significant ideological or cultural bias detected.',
    playerFit,
    biasDetails,
  };

  const fullReport: FullBiasReport = {
    score_analysis_engine: {
      input_review_score: sentimentScore,
      ideological_biases_detected: biasDetails,
      bias_adjusted_score: impact.biasAdjustedScore,
      score_context_note: 'This adjustment is a contextual calibration, not a value judgment.',
    },
  };

  logger.info(
    `[BIAS] generateBiasReport output: ${JSON.stringify({ summary, legacyAndInfluence, totalScoreAdjustment: impact.totalScoreAdjustment })}`,
  );

  return {
    summary,
    details: biasDetails,
    legacyAndInfluence,
    fullReport,
    totalScoreAdjustment: impact.totalScoreAdjustment,
  };
};

/**
 * Calculate a confidence score for a detected bias, now with more factors
 */
export const calculateBiasConfidenceScore = (
  keywordHits: number,
  detectedIn: string[],
  reviewerIntent: 'explicit' | 'implied' | 'unclear',
  nlpConfidence: number = 0,
  keywordFrequency: number = 0,
  sentimentProximityScore: number = 0,
): number => {
  logger.info(
    `[BIAS] calculateBiasConfidenceScore called with keywordHits: ${keywordHits}, detectedIn: ${JSON.stringify(
      detectedIn,
    )}, reviewerIntent: ${reviewerIntent}, nlpConfidence: ${nlpConfidence.toFixed(
      2,
    )}, keywordFrequency: ${keywordFrequency}, sentimentProximityScore: ${sentimentProximityScore.toFixed(2)}`,
  );
  let score = 0;

  if (keywordHits >= 3) score += 0.3;
  else if (keywordHits === 2) score += 0.2;
  else if (keywordHits === 1) score += 0.1;

  score += Math.min(0.3, keywordFrequency * 0.05);
  score += Math.min(0.2, sentimentProximityScore);

  if (detectedIn.includes('tone')) score += 0.1;
  if (detectedIn.includes('phrasing')) score += 0.1;

  if (reviewerIntent === 'explicit') score += 0.2;
  else if (reviewerIntent === 'implied') score += 0.1;
  else if (reviewerIntent === 'unclear') score += 0.05;

  score += nlpConfidence * 0.3;

  const finalScore = Math.min(1, score);
  logger.info(`[BIAS] calculateBiasConfidenceScore result: ${finalScore}`);
  return finalScore;
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
