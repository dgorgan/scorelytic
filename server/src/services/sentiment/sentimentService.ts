import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import logger from '@/logger';
import { env } from '@/config/env';
import { mapBiasLabelsToObjects, BIAS_KEYWORDS } from '@/services/sentiment/biasAdjustment';
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

// // === Updated unified prompt with implied bias detection instructions and dynamic culturalContext ===
// export const UNIFIED_LLM_PROMPT = `You are a precise and evidence-based cognitive/emotional bias detector analyzing video game review transcripts.

// Your job is to:
// 1. Assign a sentiment score from 1 (very negative) to 10 (very positive).
// 2. Detect any cognitive or emotional biases present in the transcript.
// 3. For each detected bias, provide:
//    - Name of the bias
//    - Confidence (percentage between 40% and 100%)
//    - Effect on sentiment score (a number between -1.0 and 1.0)
//    - Why this bias matters for gamers
//    - Specific evidence from the transcript (quote, phrase, tone, or structural cue)

// Rules:
// - Only report a bias if:
//   - Confidence is **≥ 40%**
//   - Absolute score effect is **≥ 0.1**
// - If no biases meet both criteria, return:
//   **"No clear biases detected in this segment."**
// - Never guess or infer without quoting evidence.
// - Avoid vague reasoning like "picked up from the vibe."
// - Use the approved bias definitions and triggers below. Do not invent new ones.

// Bias Definitions and Detection Triggers:

// 1. **Nostalgia Bias**
//    *Definition:* Favoring the game due to fond memories of past titles in the series.
//    *Triggers:* "reminds me of", "return to form", "finally back", excited tone when discussing old games.

// 2. **Hype Bias**
//    *Definition:* Inflated positivity driven by excitement, marketing, or community buzz.
//    *Triggers:* "most anticipated", "everyone's talking about", "blew my mind", over-the-top delivery.

// 3. **Cynicism Bias**
//    *Definition:* Excessive skepticism or negativity, often tied to expectations or distrust.
//    *Triggers:* "not what I expected", "disappointing", "overhyped", dismissive or irritated tone.

// 4. **Personal Attachment Bias**
//    *Definition:* Bias caused by a personal connection or long-standing relationship with the content.
//    *Triggers:* "I've always loved", "my favorite", "I've followed this for years".

// 5. **Sarcasm (Flag Only)**
//    *Definition:* Use of irony or mocking tone that may flip the apparent sentiment.
//    *Detection:* Flag if present, but do not score unless the sarcasm clearly influences sentiment or bias.

// ---

// ### OUTPUT STRUCTURE

// Return a single JSON object with these fields:

// {
//   "sentimentScore": number (0–10),
//   "verdict": string,
//   "sentimentSummary": string,  // concise factual sentiment summary
//   "sentimentSummaryFriendlyVerdict": string,  // natural, punchy "Should You Play This?" style summary
//   "pros": string[],
//   "cons": string[],
//   "biasIndicators": string[],
//   "alsoRecommends": string[],
//   "reviewSummary": string,
//   "biasDetection": {
//     "originalScore": number,
//     "biasesDetected": BiasImpact[],
//     "reviewSummary": string
//   },
//   "biasAdjustment": {
//     "biasAdjustedScore": number,
//     "totalScoreAdjustment": number,
//     "rationale": string
//   },
//   "sentimentSnapshot": {
//     "inferredScore": number,
//     "verdict": string,
//     "confidenceLevel": "low" | "moderate" | "high",
//     "recommendationStrength": "low" | "moderate" | "strong"
//   },
//   "culturalContext": {
//     "justification": string,  // Justification for cultural context, why it's relevant
//     "ideologicalThemes": string[],  // What cultural/ideological themes are highlighted
//     "audienceReactions": {
//       "aligned": string,  // Which audience aligns with this context (e.g., fans of gothic horror, etc.)
//       "neutral": string,  // Audience that is indifferent to cultural specifics
//       "opposed": string   // Audience that might reject this cultural context (e.g., players from different cultural backgrounds)
//     }
//   }
// }

// ---

// ### Examples:

// **Example 1: Nostalgia Bias**

// Transcript:
// > "I really love how this game finally returns to form. It reminds me of the classics I grew up with."

// Sentiment score: 8.5

// Detected biases:
// - **Nostalgia Bias**
//   Confidence: 85%
//   Effect: +0.3
//   Why it matters: Gamers may overrate the experience due to past emotional attachment.
//   Evidence: "finally returns to form" and "reminds me of the classics" show nostalgic framing.

// ---

// **Example 2: Hype Bias**

// Transcript:
// > "This was the most anticipated release of the year, and it definitely blew my mind! Everyone's talking about it."

// Sentiment score: 9.0

// Detected biases:
// - **Hype Bias**
//   Confidence: 90%
//   Effect: +0.4
//   Why it matters: Community hype or marketing may distort actual review accuracy.
//   Evidence: "most anticipated," "blew my mind," and "everyone's talking about it" suggest external excitement.

// ---

// **Example 3: Sarcasm + Cynicism Bias**

// Transcript:
// > "Oh sure, this is definitely what we were all waiting for… A recycled mess with microtransactions! Brilliant move."

// Sentiment score: 3.5

// Detected biases:
// - **Cynicism Bias**
//   Confidence: 80%
//   Effect: –0.5
//   Why it matters: Excess skepticism may cause the reviewer to ignore redeeming qualities.
//   Evidence: Sarcastic phrasing ("this is definitely what we were all waiting for"), critical tone, and the phrase "recycled mess" indicate a cynical framing.

// - **Sarcasm (Flag)**
//   Present: ✅
//   Reason: The exaggerated praise ("definitely what we were all waiting for… brilliant move") is clearly ironic, used to mock the game's monetization.

// ---

// **Example 4: Conflicting Tone (Positive + Negative)**

// Transcript:
// > "The art style is honestly stunning, and I had fun for the first few hours. But then it all fell apart — buggy, repetitive, and way too grindy."

// Sentiment score: 6.0

// Detected biases:
// - **Cynicism Bias**
//   Confidence: 70%
//   Effect: –0.3
//   Why it matters: Reviewer may focus on flaws in a way that disproportionately drags down the overall score.
//   Evidence: "fell apart," "buggy," "repetitive," "way too grindy" — suggests mounting frustration, even after a positive start.

// Note: No sarcasm detected — this is a sincere tone, just mixed sentiment.

// ---

// **Example 5: Personal Attachment Bias**

// Transcript:
// > "I've been following this developer since their first indie game. Honestly, I can overlook the issues — this one just hits differently."

// Sentiment score: 8.0

// Detected biases:
// - **Personal Attachment Bias**
//   Confidence: 75%
//   Effect: +0.2
//   Why it matters: Prior loyalty might lead the reviewer to downplay flaws or exaggerate enjoyment.
//   Evidence: "I've been following this developer since their first indie game" and "I can overlook the issues" show clear personal connection.

// ---

// Now analyze the following transcript segment:

// Transcript:
// """
// {TRANSCRIPT_CHUNK}
// """
// `;

// === Updated unified prompt with implied bias detection instructions and dynamic culturalContext ===
export const UNIFIED_LLM_PROMPT = `
You are an expert assistant analyzing video game review transcripts for sentiment, reviewer bias, and cultural context. Your goal is to extract structured insights that power a bias-aware recommendation engine. Be precise, infer only when justified, and cite textual evidence.

You must identify **both explicit and implied biases**, including tonal, habitual, or emotional indicators. If the bias is not clearly stated, inference is allowed — but **only** when supported by specific phrases or patterns. Provide **explanations** and **direct evidence** for each detected bias.

---

💡 COMMON BIAS CATEGORIES TO LOOK FOR:

- **Nostalgia Bias**: Emotional callbacks to older titles or childhood memories.
- **Franchise Bias / Studio Reputation Bias**: Inflated sentiment from brand loyalty or dev trust.
- **Influencer/Sponsored Bias**: Overemphasis on praise, defensiveness, or disclaimers ("not sponsored").
- **Reviewer Fatigue**: Signs of burnout or disengagement ("I've played too many lately", "nothing feels fresh").
- **Genre Aversion**: Dislike rooted in genre, not quality ("not a fan of these types of games").
- **Technical Criticism Bias**: Overemphasis on performance, bugs, or mechanics.
- **Contrarian Bias**: Strong rejection of broadly praised games.
- **Difficulty Bias**: Frustration caused by challenge or accessibility.
- **Comparative Bias**: Score deflation due to comparisons ("X did it better").
- **Cultural Bias**: Bias rooted in cultural preferences or values (e.g., certain cultural expectations around difficulty or gameplay pacing).

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
    "justification": string,  // Justification for cultural context, why it's relevant
    "ideologicalThemes": string[],  // What cultural/ideological themes are highlighted
    "audienceReactions": {
      "aligned": string,  // Which audience aligns with this context (e.g., fans of gothic horror, etc.)
      "neutral": string,  // Audience that is indifferent to cultural specifics
      "opposed": string   // Audience that might reject this cultural context (e.g., players from different cultural backgrounds)
    }
  }
}

---

📘 EXAMPLES:

**Example 1 — Reviewer Fatigue**
Transcript: "After playing so many open world games this year, I just didn't feel like finishing this one."
Biases: [{
  "name": "reviewer fatigue",
  "severity": "moderate",
  "scoreInfluence": -0.4,
  "explanation": "Mentions burnout and lack of energy to continue.",
  "detectedIn": ["phrasing"],
  "evidence": ["didn't feel like finishing"],
  "reviewerIntent": "implied"
}]

**Example 2 — Nostalgia & Studio Reputation**
Transcript: "This feels like classic BioWare. They've never let me down."
Biases: [{
  "name": "nostalgia bias",
  "severity": "moderate",
  "scoreInfluence": 0.3,
  "explanation": "References emotional legacy of previous titles.",
  "detectedIn": ["tone", "phrasing"],
  "evidence": ["feels like classic BioWare", "never let me down"],
  "reviewerIntent": "implied"
}]

**Example 3 — Cultural Context**
Transcript: "The game's difficulty is punishing, which is just how I like my platformers."
Biases: [{
  "name": "difficulty bias",
  "severity": "moderate",
  "scoreInfluence": 0.2,
  "explanation": "Strong preference for difficult games, indicating cultural context for challenging gameplay.",
  "detectedIn": ["tone"],
  "evidence": ["punishing", "how I like my platformers"],
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

// --- Retry helper ---
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500,
): Promise<T> => {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // Only retry on network/5xx errors
      const msg = err?.message || '';
      if (
        attempt < maxRetries - 1 &&
        (msg.includes('timeout') ||
          msg.includes('502') ||
          msg.includes('rate limit') ||
          msg.includes('429') ||
          msg.includes('network') ||
          (err.response && err.response.status >= 500))
      ) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(
          `[LLM] Retry ${attempt + 1}/${maxRetries} after error: ${msg}. Waiting ${delay}ms...`,
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      break;
    }
  }
  throw lastErr;
};

// Add logging to analyzeText
export const analyzeText = async (
  text: string,
  preferredModel?: string,
  customPrompt?: string,
  gameTitle?: string,
  creatorName?: string,
): Promise<SentimentResult> => {
  logger.info(
    `[SENTIMENT] analyzeText called with text length: ${text.length}, model: ${preferredModel}, customPrompt: ${!!customPrompt}`,
  );
  if (env.isTest || env.isProd) {
    logger.info('[TRANSCRIPT] First 500 chars:\n', text.slice(0, 500));
  }
  // Log which model is being used for transcript analysis
  let model = preferredModel || 'o3-pro';
  if (!['o3-pro', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'o3-pro';
  logger.info(`[TRANSCRIPT] Using OpenAI model: ${model}`);
  logger.info(
    `[TRANSCRIPT] Using prompt (first 500 chars): ${(customPrompt || UNIFIED_LLM_PROMPT).slice(0, 500)}`,
  );
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
  logger.info(
    `[TRANSCRIPT] Prompt length: ${promptToUse.length} chars, transcript length: ${text.length} chars`,
  );

  // --- Chunking logic ---
  const MAX_CHUNK_LENGTH = 6000;
  const transcriptChunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
    transcriptChunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
  }
  logger.info(`[TRANSCRIPT] Transcript split into ${transcriptChunks.length} chunk(s)`);

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

    const userMessage = `${prompt}\n\n${contextInfo}\n\nTranscript:\n${chunk}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    // Try o3-pro, fallback to gpt-4o if it fails
    let lastError = null;
    for (const tryModel of [model, model === 'o3-pro' ? 'gpt-4o' : null]) {
      if (!tryModel) continue;
      try {
        const completion = await retryWithBackoff(() =>
          openai.chat.completions.create({
            model: tryModel,
            messages,
            ...(supportsJsonResponse(tryModel) ? { response_format: { type: 'json_object' } } : {}),
            temperature: 0.3,
          }),
        );
        const raw = completion.choices[0]?.message?.content?.trim() || '{}';
        logger.info(`[LLM] Raw response (${tryModel}):`, raw);
        const parsed = tryParseJson(raw);
        logger.info(`[LLM] Parsed JSON (${tryModel}):`, JSON.stringify(parsed));
        return parsed;
      } catch (err) {
        logger.error(`[LLM] Completion error with model ${tryModel}:`, err);
        lastError = err;
      }
    }
    return null;
  };

  // --- Process all chunks and aggregate ---
  const results: Partial<SentimentResult>[] = [];
  for (const chunk of transcriptChunks) {
    let result = await processChunk(chunk, promptToUse);
    if (!result || !result.summary) {
      logger.warn(
        '[LLM] Primary prompt failed or missing summary — retrying with alternative prompt.',
      );
      logger.info(
        `[LLM] Retrying with fallback prompt (first 500 chars): ${(customPrompt || UNIFIED_LLM_PROMPT).slice(0, 500)}`,
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

  logger.info(`[SENTIMENT] analyzeText results: ${JSON.stringify(results)}`);
  logger.info(`[SENTIMENT] analyzeText final result: ${JSON.stringify(result)}`);
  logger.info(`[SENTIMENT] Aggregated biasIndicators: ${JSON.stringify(biasIndicators)}`);
  logger.info(`[SENTIMENT] Aggregated alsoRecommends: ${JSON.stringify(alsoRecommends)}`);
  logger.info(`[SENTIMENT] Aggregated pros: ${JSON.stringify(pros)}`);
  logger.info(`[SENTIMENT] Aggregated cons: ${JSON.stringify(cons)}`);
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

// Helper: round to nearest tenth, round up if hundredths digit is 5 or greater
const roundScoreForDisplay = (score: number): number => {
  const hundredths = Math.round((score * 100) % 10);
  if (hundredths >= 5) {
    return +(Math.ceil(score * 10) / 10).toFixed(1);
  } else {
    return +(Math.floor(score * 10) / 10).toFixed(1);
  }
};

// --- Refactored analyzeTextWithBiasAdjustment ---
export const analyzeTextWithBiasAdjustmentFull = async (
  text: string,
  preferredModel?: string,
  customPrompt?: string,
  gameTitle?: string,
  creatorName?: string,
): Promise<FullBiasScoringOutput> => {
  logger.info(
    `[SENTIMENT] analyzeTextWithBiasAdjustmentFull called with text length: ${text.length}, model: ${preferredModel}, customPrompt: ${!!customPrompt}`,
  );
  const sentiment = await analyzeText(text, preferredModel, customPrompt, gameTitle, creatorName);
  let biasesDetected: BiasImpact[] = [];
  if (sentiment.biasIndicators && sentiment.biasIndicators.length > 0) {
    biasesDetected = mapBiasLabelsToObjects(
      sentiment.biasIndicators,
      sentiment.reviewSummary || '',
      sentiment.pros,
      sentiment.cons,
    );
  }
  const biasDetection: BiasDetectionPhaseOutput = {
    originalScore: sentiment.sentimentScore ?? 5,
    biasesDetected,
    reviewSummary: sentiment.reviewSummary || '',
  };
  const totalScoreAdjustmentRaw = biasesDetected.reduce((sum, b) => sum + b.adjustedInfluence, 0);
  const biasAdjustedScoreRaw = +(biasDetection.originalScore + totalScoreAdjustmentRaw);
  const biasAdjustedScore = roundScoreForDisplay(biasAdjustedScoreRaw);
  const totalScoreAdjustment = roundScoreForDisplay(totalScoreAdjustmentRaw);
  const biasAdjustment: BiasAdjustmentPhaseOutput = {
    biasAdjustedScore, // for display
    totalScoreAdjustment,
    rationale: biasesDetected.length
      ? biasesDetected
          .map((b) => {
            const influence =
              b.adjustedInfluence > 0
                ? `${b.name} inflated by ${b.adjustedInfluence.toFixed(2)}`
                : `${b.name} deflated by ${Math.abs(b.adjustedInfluence).toFixed(2)}`;
            return influence;
          })
          .join(', ')
      : 'No significant bias detected.',
  };
  // Attach raw values for backend/debugging
  (biasAdjustment as any).biasAdjustedScoreRaw = +biasAdjustedScoreRaw.toFixed(4);
  (biasAdjustment as any).totalScoreAdjustmentRaw = +totalScoreAdjustmentRaw.toFixed(4);
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
    sentiment.culturalContext = generateCulturalContext(biasesDetected);
  }
  logger.info(
    `[SENTIMENT] analyzeTextWithBiasAdjustmentFull output: ${JSON.stringify({ sentiment, biasDetection, biasAdjustment, sentimentSnapshot })}`,
  );
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
        confidenceScore: 0.8,
        adjustedInfluence: 0.32,
        detectedIn: ['tone', 'phrasing'],
        reviewerIntent: 'implied',
        evidence: ['feels like classic BioWare', 'never let me down'],
      },
      {
        name: 'studio reputation bias',
        severity: 'moderate',
        impactOnExperience: 'Studio reputation may inflate expectations and perceived quality.',
        scoreInfluence: 0.4,
        explanation: 'Studio reputation bias detected.',
        confidenceScore: 0.7,
        adjustedInfluence: 0.28,
        detectedIn: ['tone'],
        reviewerIntent: 'implied',
        evidence: ['never let me down'],
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
  let model = preferredModel || 'o3-pro';
  if (!['o3-pro', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'o3-pro';
  const prompt = `Summarize what this video is about and list any key notes or important points. Return a JSON object with two fields: summary (string), keyNotes (array of strings).`;
  const messages = [
    { role: 'system', content: 'You are an expert assistant for summarizing YouTube videos.' },
    { role: 'user', content: prompt },
    { role: 'user', content: `Transcript:\n${text}` },
  ];
  let lastError = null;
  for (const tryModel of [model, model === 'o3-pro' ? 'gpt-4o' : null]) {
    if (!tryModel) continue;
    try {
      const completion = await retryWithBackoff(() =>
        openai.chat.completions.create({
          model: tryModel,
          messages: messages as any,
          ...(supportsJsonResponse(tryModel) ? { response_format: { type: 'json_object' } } : {}),
          temperature: 0.7,
        }),
      );
      const raw = completion.choices[0]?.message?.content?.trim() || '{}';
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
      return {
        summary: parsed.summary || '',
        keyNotes: Array.isArray(parsed.keyNotes) ? parsed.keyNotes : [],
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Both o3-pro and gpt-4o failed for analyzeGeneralSummary: ${lastError}`);
};

export { analyzeText as analyzeSentiment };
