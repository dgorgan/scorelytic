import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import logger from '@/logger';
import { env } from '@/config/env';
import {
  mapBiasLabelsToObjects,
  evaluateBiasImpact,
  BIAS_KEYWORDS,
} from '@/services/sentiment/biasAdjustment';
import type { BiasImpact } from '@scorelytic/shared';

export type SentimentResult = {
  summary: string | null;
  sentimentScore: number | null;
  verdict: string | null;
  sentimentSummary: string | null;
  biasIndicators: string[];
  alsoRecommends: string[];
  pros: string[];
  cons: string[];
  reviewSummary: string | null;
  culturalContext: CulturalContextExplanation | null;
};

export const getEmbedding = async (
  text: string,
  model: string = 'text-embedding-ada-002',
): Promise<number[]> => {
  // Kill switch to prevent OpenAI costs
  if (env.DISABLE_OPENAI) {
    logger.info('[LLM] OpenAI embeddings disabled via DISABLE_OPENAI env var');
    return new Array(1536).fill(0); // Return zero vector
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const resp = await openai.embeddings.create({
    model,
    input: text,
  });
  return resp.data[0].embedding;
};

const supportsJsonResponse = (model: string) => {
  return model.startsWith('gpt-3.5-turbo') || model.startsWith('gpt-4-turbo');
};

// --- New types for tiered bias/sentiment reporting ---
export type BiasDetectionPhaseOutput = {
  originalScore: number;
  biasesDetected: BiasImpact[];
  reviewSummary: string;
};

export type BiasAdjustmentPhaseOutput = {
  biasAdjustedScore: number;
  totalScoreAdjustment: number;
  rationale: string;
};

export type SentimentSnapshot = {
  inferredScore: number;
  verdict: string;
  confidenceLevel: 'low' | 'moderate' | 'high';
  recommendationStrength: 'low' | 'moderate' | 'strong';
};

export type CulturalContextExplanation = {
  justification: string;
  ideologicalThemes: string[];
  audienceReactions: {
    aligned: string;
    neutral: string;
    opposed: string;
  };
};

export type FullBiasScoringOutput = {
  sentiment: SentimentResult;
  biasDetection: BiasDetectionPhaseOutput;
  biasAdjustment: BiasAdjustmentPhaseOutput;
  sentimentSnapshot: SentimentSnapshot;
};

// === Updated unified prompt with implied bias detection instructions and dynamic culturalContext ===
export const UNIFIED_LLM_PROMPT = `
You are an expert assistant analyzing video game review transcripts for sentiment, reviewer bias, and cultural context. Your goal is to extract structured insights that power a bias-aware recommendation engine. Be precise, infer only when justified, and cite textual evidence.

You must identify **both explicit and implied biases**, including tonal, habitual, or emotional indicators. If the bias is not clearly stated, inference is allowed — but **only** when supported by specific phrases or patterns. Provide **explanations** and **direct evidence** for each detected bias.

---

💡 COMMON BIAS CATEGORIES TO LOOK FOR:

- **Nostalgia Bias**: Emotional callbacks to older titles or childhood memories.
- **Franchise Bias / Studio Reputation Bias**: Inflated sentiment from brand loyalty or dev trust.
- **Influencer/Sponsored Bias**: Over-the-top praise, defensiveness, or disclaimers (“not sponsored”).
- **Reviewer Fatigue**: Signs of burnout or disengagement (“I’ve played too many lately”, “nothing feels fresh”).
- **Genre Aversion**: Dislike rooted in genre, not quality (“not a fan of these types of games”).
- **Technical Criticism Bias**: Overemphasis on performance, bugs, or mechanics.
- **Contrarian Bias**: Strong rejection of broadly praised games.
- **Difficulty Bias**: Frustration caused by challenge or accessibility.
- **Comparative Bias**: Score deflation due to comparisons (“X did it better”).

You may add new bias types if you justify them clearly.

---

🔍 FOR EACH DETECTED BIAS:

Include:
- **name** (e.g. "nostalgia bias")
- **severity** (low / moderate / high)
- **explanation** (what pattern or phrasing triggered it)
- **scoreInfluence** (number between -1 and +1)
- **detectedIn** (e.g. "tone", "phrasing", "explicit statements", "examples")
- **evidence** (direct phrases or short quotes)
- **reviewerIntent** (explicit / implied / unclear)

---

📦 OUTPUT STRUCTURE:

Return a single JSON object with the following:

{
  "sentimentScore": number (0–10),
  "verdict": string,
  "sentimentSummary": string,
  "pros": string[],
  "cons": string[],
  "biasIndicators": string[],
  "alsoRecommends": string[],
  "reviewSummary": string,
  "biasDetection": {
    "originalScore": number,
    "biasesDetected": BiasImpact[],
    "reviewSummary": string
  },
  "biasAdjustment": {
    "biasAdjustedScore": number,
    "totalScoreAdjustment": number,
    "rationale": string
  },
  "sentimentSnapshot": {
    "inferredScore": number,
    "verdict": string,
    "confidenceLevel": "low" | "moderate" | "high",
    "recommendationStrength": "low" | "moderate" | "strong"
  },
  "culturalContext": {
    "justification": string,
    "ideologicalThemes": string[],
    "audienceReactions": {
      "aligned": string,
      "neutral": string,
      "opposed": string
    }
  }
}

---

📘 EXAMPLES:

**Example 1 — Reviewer Fatigue**
Transcript: “After playing so many open world games this year, I just didn’t feel like finishing this one.”
Biases: [{
  "name": "reviewer fatigue",
  "severity": "moderate",
  "scoreInfluence": -0.4,
  "explanation": "Mentions burnout and lack of energy to continue.",
  "detectedIn": ["phrasing"],
  "evidence": ["didn’t feel like finishing"],
  "reviewerIntent": "implied"
}]

**Example 2 — Nostalgia & Studio Reputation**
Transcript: “This feels like classic BioWare. They’ve never let me down.”
Biases: [{
  "name": "nostalgia bias",
  "severity": "moderate",
  "scoreInfluence": 0.3,
  "explanation": "References emotional legacy of previous titles.",
  "detectedIn": ["tone", "phrasing"],
  "evidence": ["feels like classic BioWare", "never let me down"],
  "reviewerIntent": "implied"
}]

---

Review Transcript:
{{REVIEW_TRANSCRIPT}};
`;

const SYSTEM_PROMPT = `You are an expert sentiment analysis assistant specialized in video game reviews. Extract nuanced sentiment, tone, reviewer biases, and key pros/cons based on both explicit statements and implied tone. Inferred insights are allowed if strongly implied. Do not invent details not supported by the text.`;

// --- Utility: dedupe helper ---
const dedupe = (arr: string[]) => [...new Set(arr.map((s) => s.trim()))];

// --- Canonical bias labels from BIAS_KEYWORDS ---
const CANONICAL_BIAS_LABELS = Object.keys(BIAS_KEYWORDS);

// --- Utility: robust canonical bias mapping ---
const mapToCanonicalBias = (label: string): string => {
  const lower = label.toLowerCase();
  // Direct match
  if (CANONICAL_BIAS_LABELS.includes(lower)) return lower;
  // Fuzzy match: check if label contains any canonical label as substring
  for (const canon of CANONICAL_BIAS_LABELS) {
    if (lower.includes(canon.replace(/ bias$/, ''))) return canon;
  }
  // Fuzzy match: check if label matches any keyword
  for (const canon of CANONICAL_BIAS_LABELS) {
    const keywords = BIAS_KEYWORDS[canon] || [];
    if (keywords.some((kw) => lower.includes(kw))) return canon;
  }
  return label; // fallback to original if not matched
};

// --- Optional: add canonical bias label list to the prompt for LLM transparency ---
const CANONICAL_BIAS_LABELS_LINE = `\nRecognized bias labels: ${CANONICAL_BIAS_LABELS.join(', ')}`;

// Patch UNIFIED_LLM_PROMPT to include canonical bias label list if not present
export const UNIFIED_LLM_PROMPT_WITH_LABELS = UNIFIED_LLM_PROMPT.includes('Recognized bias labels:')
  ? UNIFIED_LLM_PROMPT
  : UNIFIED_LLM_PROMPT + CANONICAL_BIAS_LABELS_LINE;

// --- Bias detection from text content using BIAS_KEYWORDS ---
export const detectBiasesFromTextContent = (text: string): string[] => {
  const detected: string[] = [];
  const lcText = text.toLowerCase();
  for (const bias in BIAS_KEYWORDS) {
    if (BIAS_KEYWORDS[bias].some((kw) => lcText.includes(kw))) {
      detected.push(bias);
    }
  }
  return detected;
};

// --- Helper: Generate fallback cultural context ---
export function generateCulturalContext(biasImpact: BiasImpact[]): CulturalContextExplanation {
  if (!biasImpact.length) {
    return {
      justification: 'No significant ideological or cultural bias detected.',
      ideologicalThemes: [],
      audienceReactions: {
        aligned: 'positive',
        neutral: 'mixed',
        opposed: 'negative',
      },
    };
  }
  return {
    justification: `Score adjusted to reflect detected biases: ${biasImpact.map((b) => b.name).join(', ')}.`,
    ideologicalThemes: biasImpact.map((b) => b.name),
    audienceReactions: {
      aligned: 'positive',
      neutral: 'mixed',
      opposed: 'negative',
    },
  };
}

export const analyzeText = async (
  text: string,
  preferredModel?: string, // optionally pass preferred model
  customPrompt?: string,
  gameTitle?: string,
  creatorName?: string,
): Promise<SentimentResult> => {
  if (env.isTest || env.isProd) {
    logger.info('[TRANSCRIPT] First 500 chars:\n', text.slice(0, 500));
  }
  // Log which model is being used for transcript analysis
  let model = preferredModel || 'gpt-4o';
  if (!['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'gpt-4o';
  logger.info(`[TRANSCRIPT] Using OpenAI model: ${model}`);
  if (env.DISABLE_OPENAI) {
    logger.info('[LLM] OpenAI disabled via DISABLE_OPENAI env var');
    return {
      summary: 'No clear summary detected.',
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
      culturalContext: null,
    };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // --- Prompt selection logic ---
  const promptToUse = customPrompt || UNIFIED_LLM_PROMPT;

  // --- Chunking logic ---
  const MAX_CHUNK_LENGTH = 6000;
  const transcriptChunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
    transcriptChunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
  }

  // --- Helper to process a single chunk ---
  const tryParseJson = (raw: string): any | null => {
    const match = raw.match(/\{[\s\S]*\}/);
    try {
      return JSON.parse(match ? match[0] : raw);
    } catch {
      return null;
    }
  };

  const processChunk = async (chunk: string, prompt: string): Promise<any> => {
    const contextInfo = [
      gameTitle ? `Game Title: ${gameTitle}` : '',
      creatorName ? `Creator: ${creatorName}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
      { role: 'user', content: `${contextInfo}\nTranscript:\n${chunk}` },
    ];
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        ...(supportsJsonResponse(model) ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0.7,
      });
      const raw = completion.choices[0]?.message?.content?.trim() || '{}';
      if (env.LOG_LLM_OUTPUT) {
        logger.info('[LLM] Raw response:', raw);
      }
      return tryParseJson(raw);
    } catch (err) {
      return null;
    }
  };

  // --- Process all chunks and aggregate ---
  const results: Partial<SentimentResult>[] = [];
  for (const chunk of transcriptChunks) {
    let result = await processChunk(chunk, promptToUse);
    if (!result || !result.summary) {
      logger.warn(
        '[LLM] Primary prompt failed or missing summary — retrying with alternative prompt.',
      );
      result = await processChunk(chunk, customPrompt || UNIFIED_LLM_PROMPT);
    }
    if (result) results.push(result);
  }

  // --- Aggregation helpers ---
  const toStringOrNull = (v: any) => (typeof v === 'string' ? v : null);
  const toStringArray = (v: any) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  // const toNumberOrNull = (v: any): number | null => (typeof v === 'number' ? v : null);

  // --- Aggregate results (simple: take first non-empty, or merge arrays) ---
  const aggregate = (field: keyof SentimentResult, isArray = false): string[] | string | null => {
    if (isArray) {
      return results.flatMap((r) => toStringArray(r[field])).filter(Boolean) as string[];
    } else {
      return toStringOrNull(
        results.find((r) => r[field] && r[field] !== 'No clear summary detected.')?.[field],
      );
    }
  };

  const sentimentScore =
    results.find((r) => typeof r.sentimentScore === 'number')?.sentimentScore ?? 5;
  const verdict = aggregate('verdict') as string | null;
  const sentimentSummary = aggregate('sentimentSummary') as string | null;
  // --- Deduplicate and canonicalize biasIndicators ---
  let biasIndicators = aggregate('biasIndicators', true) as string[];
  biasIndicators = dedupe((biasIndicators || []).map(mapToCanonicalBias));
  // --- Deduplicate alsoRecommends, pros, cons ---
  const alsoRecommends = dedupe((aggregate('alsoRecommends', true) as string[]) || []);
  const pros = dedupe((aggregate('pros', true) as string[]) || []);
  const cons = dedupe((aggregate('cons', true) as string[]) || []);
  const summary = aggregate('summary') as string | null;
  const reviewSummary = aggregate('reviewSummary') as string | null;
  // --- Type guard for culturalContext ---
  const culturalContext =
    results.find(
      (r): r is { culturalContext: CulturalContextExplanation } =>
        typeof r === 'object' &&
        r !== null &&
        'culturalContext' in r &&
        r.culturalContext !== undefined,
    )?.culturalContext || null;

  // Always provide safe defaults if LLM output is empty/null
  const result: SentimentResult = {
    summary:
      toStringOrNull(summary) || toStringOrNull(sentimentSummary) || 'No clear summary detected.',
    sentimentScore:
      typeof sentimentScore === 'number' && sentimentScore >= 0 && sentimentScore <= 10
        ? sentimentScore
        : 5,
    verdict: toStringOrNull(verdict) || 'mixed',
    sentimentSummary: toStringOrNull(sentimentSummary) || 'Mixed',
    biasIndicators,
    alsoRecommends,
    pros,
    cons,
    reviewSummary: toStringOrNull(reviewSummary) || 'No review summary available.',
    culturalContext,
  };
  if (!result.summary || result.summary === 'No clear summary detected.') {
    logger.warn('[LLM] Warning: summary is missing, using fallback (sentimentSummary or default).');
  }

  // Log a warning if the LLM output was mostly empty
  const allEmpty = Object.values(result).every(
    (v) => v === null || (Array.isArray(v) && v.length === 0),
  );
  if (allEmpty) {
    logger.warn('[LLM] Warning: LLM returned mostly empty result, using safe defaults.', result);
  }

  return result;
};

export type BiasObject = {
  name: string;
  severity: 'low' | 'moderate' | 'high';
  impactOnExperience: string;
  scoreInfluence: number; // positive or negative
  explanation: string;
};

export type BiasAdjustmentResult = {
  originalScore: number;
  biasAdjustedScore: number;
  totalScoreAdjustment: number;
  biasAnalysis: BiasObject[];
  audienceFit: string;
  adjustmentRationale: string;
};

// --- Refactored analyzeTextWithBiasAdjustment ---
export const analyzeTextWithBiasAdjustmentFull = async (
  text: string,
  preferredModel?: string,
  customPrompt?: string,
  gameTitle?: string,
  creatorName?: string,
): Promise<FullBiasScoringOutput> => {
  const sentiment = await analyzeText(text, preferredModel, customPrompt, gameTitle, creatorName);
  // Bias detection phase
  const biasDetection: BiasDetectionPhaseOutput = {
    originalScore: sentiment.sentimentScore ?? 5,
    biasesDetected: mapBiasLabelsToObjects(
      sentiment.biasIndicators,
      sentiment.reviewSummary || '',
      sentiment.pros,
      sentiment.cons,
    ),
    reviewSummary: sentiment.reviewSummary || '',
  };
  // Bias adjustment phase
  let biasAdjustmentRaw = evaluateBiasImpact(biasDetection.originalScore, sentiment.biasIndicators);
  // Fallback: If LLM did not adjust score or rationale is missing, synthesize adjustment
  if (
    biasAdjustmentRaw.biasAdjustedScore === biasDetection.originalScore ||
    !biasAdjustmentRaw.adjustmentRationale ||
    biasAdjustmentRaw.adjustmentRationale.trim() === ''
  ) {
    // Synthesize rationale and adjustment
    const biasObjs = mapBiasLabelsToObjects(
      sentiment.biasIndicators,
      sentiment.reviewSummary || '',
      sentiment.pros,
      sentiment.cons,
    );
    const totalScoreAdjustment = biasObjs.reduce(
      (sum: number, b: BiasImpact) => sum + b.scoreInfluence,
      0,
    );
    const biasAdjustedScore = Math.max(
      0,
      Math.min(10, Math.round((biasDetection.originalScore - totalScoreAdjustment) * 10) / 10),
    );
    const rationale =
      totalScoreAdjustment === 0
        ? 'No bias adjustment was made because no significant biases were detected.'
        : `Score adjusted by ${totalScoreAdjustment > 0 ? '-' : '+'}${Math.abs(totalScoreAdjustment)} based on detected biases: ${biasObjs
            .map((b) => b.name)
            .join(', ')}.`;
    biasAdjustmentRaw = {
      ...biasAdjustmentRaw,
      biasAdjustedScore,
      totalScoreAdjustment: -totalScoreAdjustment,
      adjustmentRationale: rationale,
    };
    logger.warn('[BiasAdjustment] Fallback adjustment/rationale used for review.');
  }
  const biasAdjustment: BiasAdjustmentPhaseOutput = {
    biasAdjustedScore: biasAdjustmentRaw.biasAdjustedScore,
    totalScoreAdjustment: biasAdjustmentRaw.totalScoreAdjustment,
    rationale: biasAdjustmentRaw.adjustmentRationale,
  };
  // Sentiment snapshot (simple heuristics for now)
  const confidenceLevel: 'low' | 'moderate' | 'high' =
    Math.abs((sentiment.sentimentScore ?? 5) - 5) > 2 ? 'high' : 'moderate';
  const recommendationStrength: 'low' | 'moderate' | 'strong' =
    (sentiment.sentimentScore ?? 5) > 7
      ? 'strong'
      : (sentiment.sentimentScore ?? 5) > 5
        ? 'moderate'
        : 'low';
  const sentimentSnapshot: SentimentSnapshot = {
    inferredScore: sentiment.sentimentScore ?? 5,
    verdict: sentiment.verdict || 'mixed',
    confidenceLevel,
    recommendationStrength,
  };
  // If LLM did not provide culturalContext, synthesize and set it inside sentiment
  if (!sentiment.culturalContext) {
    sentiment.culturalContext = generateCulturalContext(
      biasAdjustment.biasAdjustedScore !== undefined ? biasDetection.biasesDetected : [],
    );
  }
  return {
    sentiment,
    biasDetection,
    biasAdjustment,
    sentimentSnapshot,
  };
};

// --- Mock output example ---
export const MOCK_FULL_BIAS_SCORING_OUTPUT: FullBiasScoringOutput = {
  sentiment: {
    summary:
      "Dragon Age: The Veilguard revitalizes BioWare's RPG legacy with its stunning visuals, engaging storytelling, and rich character development, though some combat aspects may disappoint tactical purists.",
    sentimentScore: 9.2,
    verdict: 'positive',
    sentimentSummary: 'Highly positive',
    biasIndicators: [
      'nostalgia bias',
      'studio reputation bias',
      'personal connection to non-binary representation',
      'high expectations from the Dragon Age franchise',
    ],
    alsoRecommends: [
      'Dragon Age: Origins',
      'Mass Effect 2',
      'Metaphor Ref Fantasio',
      'World of Warcraft: The War Within expansion',
    ],
    pros: [
      'stunning visuals',
      'engaging party-based storytelling',
      'memorable boss fights',
      'rich character designs and customization',
      'strong character development',
      'authentic representation of gender identity',
      'engaging narrative twists',
      'top-notch cinematics',
    ],
    cons: [
      'repetitive mob fights',
      'lack of individuality in party members during combat',
      'disconnected from past game choices',
      'awkward pacing in early parts',
    ],
    reviewSummary:
      "Dragon Age: The Veilguard revitalizes BioWare's RPG legacy with its stunning visuals, engaging storytelling, and rich character development, though some combat aspects may disappoint tactical purists.",
    culturalContext: {
      justification:
        'Based on the review transcript, certain ideological themes and narrative framings may influence audience perception.',
      ideologicalThemes: ['representation', 'studio reputation'],
      audienceReactions: {
        aligned:
          'Likely to resonate strongly with fans of inclusive narratives and franchise loyalists.',
        neutral: 'May appreciate the technical and narrative strengths, but not be deeply moved.',
        opposed: 'Could be critical of perceived ideological or franchise-driven elements.',
      },
    },
  },
  biasDetection: {
    originalScore: 9.2,
    biasesDetected: [
      {
        name: 'nostalgia bias',
        severity: 'moderate',
        impactOnExperience:
          'Nostalgia may cause the reviewer to overlook flaws or overrate positive aspects.',
        scoreInfluence: 0.4,
        explanation:
          'Nostalgia bias detected; reviewer may rate higher due to fondness for the franchise.',
      },
      {
        name: 'studio reputation bias',
        severity: 'moderate',
        impactOnExperience: 'Studio reputation may inflate expectations and perceived quality.',
        scoreInfluence: 0.4,
        explanation: 'Studio reputation bias detected.',
      },
    ],
    reviewSummary:
      "Dragon Age: The Veilguard revitalizes BioWare's RPG legacy with its stunning visuals, engaging storytelling, and rich character development, though some combat aspects may disappoint tactical purists.",
  },
  biasAdjustment: {
    biasAdjustedScore: 8.3,
    totalScoreAdjustment: -0.9,
    rationale: 'Score adjusted based on detected nostalgia and studio reputation biases.',
  },
  sentimentSnapshot: {
    inferredScore: 9.2,
    verdict: 'positive',
    confidenceLevel: 'high',
    recommendationStrength: 'strong',
  },
};

export const analyzeGeneralSummary = async (
  text: string,
  preferredModel?: string,
): Promise<{ summary: string; keyNotes: string[] }> => {
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = preferredModel || 'gpt-4o';
  const prompt = `Summarize what this video is about and list any key notes or important points. Return a JSON object with two fields: summary (string), keyNotes (array of strings).`;
  const messages = [
    { role: 'system', content: 'You are an expert assistant for summarizing YouTube videos.' },
    { role: 'user', content: prompt },
    { role: 'user', content: `Transcript:\n${text}` },
  ];
  const completion = await openai.chat.completions.create({
    model,
    messages: messages as any,
    ...(supportsJsonResponse(model) ? { response_format: { type: 'json_object' } } : {}),
    temperature: 0.7,
  });
  const raw = completion.choices[0]?.message?.content?.trim() || '{}';
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
  return {
    summary: parsed.summary || '',
    keyNotes: Array.isArray(parsed.keyNotes) ? parsed.keyNotes : [],
  };
};

export { analyzeText as analyzeSentiment };
