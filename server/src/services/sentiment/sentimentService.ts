import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import logger from '@/logger';
import { env } from '@/config/env';
import { mapBiasLabelsToObjects, evaluateBiasImpact } from '@/services/sentiment/biasAdjustment';
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

const SENTIMENT_LABELS = [
  'Overwhelmingly positive',
  'Very positive',
  'Mostly positive',
  'Mixed',
  'Neutral',
  'Negative',
  'Contrarian',
  'Positive (influencer bias)',
  'Positive (sponsored)',
  'Mixed to negative',
  'Mixed (genre aversion)',
  'Mixed (reviewer fatigue)',
  'Positive with platform bias',
];

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
  culturalContext?: CulturalContextExplanation;
};

// --- Updated LLM prompt for richer, tiered output ---
export const UPDATED_LLM_PROMPT = `You are an expert data analyst specializing in reviewing and adjusting game review scores based on ideological and other biases detected in review transcripts. Your goal is to produce a multi-layered analysis, including bias detection, score adjustment, sentiment snapshot, and cultural context.

Return a JSON object with these fields:

- biasDetection: { originalScore, biasesDetected (array of bias objects), reviewSummary }
- biasAdjustment: { biasAdjustedScore, totalScoreAdjustment, rationale }
- sentimentSnapshot: { inferredScore, verdict, confidenceLevel (low/moderate/high), recommendationStrength (low/moderate/strong) }
- culturalContext: { justification, ideologicalThemes (array), audienceReactions: { aligned, neutral, opposed } }

Rules:
- Each field must be present in the output.
- To calculate biasAdjustedScore, sum the scoreInfluence values from biasesDetected and add the total to originalScore. Clamp the result to [0, 10].
- If the sum is zero, set biasAdjustedScore equal to originalScore and explain in the rationale why no adjustment was made.
- Always provide a rationale, even if no adjustment is made.
- Use clean, modern language. Do not hallucinate facts.
- Respond ONLY with JSON. No extra commentary.

Transcript:
{{REVIEW_TRANSCRIPT}}`;

export const UPDATED_LLM_PROMPT_ALTERNATIVE = `You are an expert assistant analyzing long-form video game review transcripts. Your goal is to extract nuanced sentiment, tone, reviewer biases, and key pros/cons—based on both explicit statements and implied tone.

Analyze the following review transcript and return a JSON object with these fields:

- summary (string): a high-level summary of the review content and key themes. MUST be present, even if brief.
- sentimentScore (number, 0 to 10): inferred score based on the tone of the review
- verdict (string): "positive", "negative", or "mixed" — overall qualitative verdict
- sentimentSummary (string): one label from this list ONLY (MUST be present):
  ["Overwhelmingly positive", "Very positive", "Mostly positive", "Mixed", "Neutral", "Negative", "Contrarian", "Positive (influencer bias)", "Positive (sponsored)", "Mixed to negative", "Mixed (genre aversion)", "Mixed (reviewer fatigue)", "Positive with platform bias"]
- biasIndicators (array of strings): labels from this list ONLY:
  ["nostalgia bias", "influencer bias", "sponsored bias", "contrarian", "genre aversion", "reviewer fatigue", "technical criticism", "platform bias", "accessibility bias", "story-driven bias", "franchise bias"]
- alsoRecommends (array of strings): names of other games the reviewer explicitly mentions or implicitly compares
- pros (array of strings): clear or implied strengths/praises of the game
- cons (array of strings): clear or implied weaknesses/criticisms of the game
- reviewSummary (string): A concise 1-2 sentence summary of the overall tone and takeaway, aimed at gamers deciding whether to play.

Rules:
- Inferred insights are allowed if they are strongly implied by wording or tone.
- Do not hallucinate facts or features not supported by the transcript.
- If a field is not mentioned or cannot be reasonably inferred, return null (for strings/numbers) or an empty array (for arrays).
- Use clean, modern language that reflects how a skilled reviewer or aggregator might summarize a game.

Return ONLY a JSON object matching the specified fields — no additional text, commentary, or explanation.

Transcript:
{{REVIEW_TRANSCRIPT}}`;

const SYSTEM_PROMPT = `You are an expert sentiment analysis assistant specialized in video game reviews. Extract nuanced sentiment, tone, reviewer biases, and key pros/cons based on both explicit statements and implied tone. Inferred insights are allowed if strongly implied. Do not invent details not supported by the text.`;

const FEW_SHOT = `Example transcript: "Dragon Age: The Veilguard surprised me. As someone who loved Origins, this felt like a return to meaningful party-based storytelling. Boss fights felt deliberate, though trash mobs wore thin. Visually, it's the best the series has ever looked. I missed more meaningful consequences from my Inquisition save, though."
Expected JSON: {"sentimentScore": 8.5, "verdict": "positive", "sentimentSummary": "Very positive", "pros": ["strong party-based storytelling", "excellent visuals", "memorable boss fights"], "cons": ["repetitive enemy mobs", "limited story carryover from past games"], "biasIndicators": ["nostalgia bias", "franchise bias"], "alsoRecommends": ["Dragon Age: Origins", "Mass Effect 2"], "reviewSummary": "A rewarding RPG that revives the series' strengths, even if legacy choices take a backseat."}
`;

export const FEW_SHOT_EXAMPLES = [
  {
    transcript:
      "Dragon Age: The Veilguard surprised me. As someone who loved Origins, this felt like a return to meaningful party-based storytelling. Boss fights felt deliberate, though trash mobs wore thin. Visually, it's the best the series has ever looked. I missed more meaningful consequences from my Inquisition save, though.",
    expected: {
      sentimentScore: 8.5,
      verdict: 'positive',
      sentimentSummary: 'Very positive',
      pros: ['strong party-based storytelling', 'excellent visuals', 'memorable boss fights'],
      cons: ['repetitive enemy mobs', 'limited story carryover from past games'],
      biasIndicators: ['nostalgia bias', 'franchise bias'],
      alsoRecommends: ['Dragon Age: Origins', 'Mass Effect 2'],
      reviewSummary:
        "A rewarding RPG that revives the series' strengths, even if legacy choices take a backseat.",
    },
  },
];

// --- Utility: dedupe helper ---
const dedupe = (arr: string[]) => [...new Set(arr.map((s) => s.trim()))];

// --- Utility: fuzzy/canonical bias label mapping ---
const CANONICAL_BIAS_LABELS = [
  'nostalgia bias',
  'influencer bias',
  'sponsored bias',
  'contrarian',
  'genre aversion',
  'reviewer fatigue',
  'technical criticism',
  'platform bias',
  'accessibility bias',
  'story-driven bias',
  'franchise bias',
];
const mapToCanonicalBias = (label: string): string => {
  const lower = label.toLowerCase();
  for (const canon of CANONICAL_BIAS_LABELS) {
    if (lower.includes(canon.split(' ')[0])) return canon;
    if (lower === canon) return canon;
  }
  return label; // fallback to original if not matched
};

export const analyzeText = async (
  text: string,
  preferredModel?: string, // optionally pass preferred model
  customPrompt?: string,
  labels: string[] = SENTIMENT_LABELS,
  gameTitle?: string,
  creatorName?: string,
): Promise<SentimentResult> => {
  if (env.isTest || env.isProd) {
    logger.info('[TRANSCRIPT] First 500 chars:\n', text.slice(0, 500));
  }
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
    };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  let model = preferredModel || 'gpt-4o';
  if (!['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'gpt-4o';

  // --- Prompt selection logic ---
  const shouldUseAlternativePrompt =
    model.includes('gpt-3.5') || env.LLM_PROMPT_STYLE === 'ALTERNATIVE';
  const promptToUse =
    customPrompt ||
    (shouldUseAlternativePrompt ? UPDATED_LLM_PROMPT_ALTERNATIVE : UPDATED_LLM_PROMPT);

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
    // If result is null or missing summary, and we didn't already use the alternative prompt, retry with it
    if (
      (!result || !result.summary) &&
      !shouldUseAlternativePrompt &&
      !customPrompt // only retry if not using a custom prompt
    ) {
      logger.warn(
        '[LLM] Primary prompt failed or missing summary — retrying with alternative prompt.',
      );
      result = await processChunk(chunk, UPDATED_LLM_PROMPT_ALTERNATIVE);
    }
    if (result) results.push(result);
  }

  // --- Aggregation helpers ---
  const toStringOrNull = (v: any) => (typeof v === 'string' ? v : null);
  const toStringArray = (v: any) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  const toNumberOrNull = (v: any): number | null => (typeof v === 'number' ? v : null);

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
  labels: string[] = SENTIMENT_LABELS,
  gameTitle?: string,
  creatorName?: string,
): Promise<FullBiasScoringOutput> => {
  const sentiment = await analyzeText(
    text,
    preferredModel,
    customPrompt,
    labels,
    gameTitle,
    creatorName,
  );
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
  // Cultural context (mock/fallback for now)
  const culturalContext: CulturalContextExplanation = {
    justification:
      'Based on the review transcript, certain ideological themes and narrative framings may influence audience perception.',
    ideologicalThemes: ['representation', 'studio reputation'],
    audienceReactions: {
      aligned:
        'Likely to resonate strongly with fans of inclusive narratives and franchise loyalists.',
      neutral: 'May appreciate the technical and narrative strengths, but not be deeply moved.',
      opposed: 'Could be critical of perceived ideological or franchise-driven elements.',
    },
  };
  return {
    sentiment,
    biasDetection,
    biasAdjustment,
    sentimentSnapshot,
    culturalContext,
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
