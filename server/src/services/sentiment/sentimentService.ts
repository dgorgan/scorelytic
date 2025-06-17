import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import logger from '@/logger';
import { env } from '@/config/env';
import { mapBiasLabelsToObjects, BIAS_KEYWORDS } from '@/services/sentiment/biasAdjustment';
import type { BiasImpact } from '@scorelytic/shared/types/biasReport';

export type SentimentResult = {
  sentimentScore: number | null;
  verdict: string | null;
  sentimentSummary: string | null;
  sentimentSummaryFriendlyVerdict: string | null;
  biasIndicators: string[];
  alsoRecommends: string[];
  pros: string[];
  cons: string[];
  reviewSummary: string | null;
  legacyAndInfluence: legacyAndInfluenceExplanation | null;
  noBiasExplanationFromLLM?: string;
  satirical?: boolean; // Flag indicating if the review is satirical/sarcastic in nature
};

// Type for the raw LLM response that might include bias detection structure
type LLMRawResponse = Partial<SentimentResult> & {
  biasDetection?: {
    noBiasExplanation?: string;
    originalScore?: number;
    biasesDetected?: any[];
    evidenceCount?: number;
    biasInteractions?: any[];
  };
  noBiasExplanation?: string;
};

export const getEmbedding = async (
  text: string,
  model: string = 'text-embedding-ada-002',
): Promise<number[]> => {
  // Kill switch to prevent OpenAI costs
  if (env.DISABLE_OPENAI) {
    logger.info({ model }, '[LLM] OpenAI embeddings disabled via DISABLE_OPENAI env var');
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
  evidenceCount?: number;
  noBiasExplanation?: string;
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

export type legacyAndInfluenceExplanation = {
  justification: string;
  ideologicalThemes: string[];
  playerFit: {
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

// // === Updated unified prompt with implied bias detection instructions and dynamic legacyAndInfluence ===
export const UNIFIED_LLM_PROMPT = `You are a precise and evidence-based cognitive/emotional bias detector analyzing video game review transcripts.

Your job is to:
1. Assign a sentiment score from 1 (very negative) to 10 (very positive).
2. Detect any cognitive or emotional biases present in the transcript.
3. For each detected bias, provide:
   - Name of the bias
   - Confidence (percentage between 40% and 100%)
   - Effect on sentiment score (a number between -1.0 and 1.0)
   - Why this bias matters for gamers
   - Specific evidence from the transcript (quote, phrase, tone, or structural cue)
   - **Evidence count**: Number of distinct occurrences of bias triggers found in the transcript

Rules:
- Only report a bias if:
  - Confidence is **≥ 40%**
  - Absolute score effect is **≥ 0.1**
- If no biases meet both criteria, return:
  **"No clear biases detected in this segment."**
- Never guess or infer without quoting evidence.
- Avoid vague reasoning like "picked up from the vibe."
- Use the approved bias definitions and triggers below. Do not invent new ones.

Bias Definitions and Detection Triggers:

1. **Nostalgia Bias**
   *Definition:* Favoring the game due to fond memories of past titles in the series.
   *Triggers:* "reminds me of", "return to form", "finally back", excited tone when discussing old games.

2. **Hype Bias**
   *Definition:* Inflated positivity driven by excitement, marketing, or community buzz.
   *Triggers:* "most anticipated", "everyone's talking about", "blew my mind", over-the-top delivery.

3. **Cynicism Bias**
   *Definition:* Excessive skepticism or negativity, often tied to expectations or distrust.
   *Triggers:* "not what I expected", "disappointing", "overhyped", dismissive or irritated tone.

4. **Personal Attachment Bias**
   *Definition:* Bias caused by a personal connection or long-standing relationship with the content.
   *Triggers:* "I've always loved", "my favorite", "I've followed this for years".

5. **Sarcasm (Special Handling)**
   *Definition:* Use of irony or mocking tone that may flip the apparent sentiment.
   *Detection:* Flag if present, but handle differently based on context:
   - **Occasional Sarcasm**: Brief sarcastic remarks in otherwise genuine reviews (score effect: 0.0, flag only)
   - **Fully Satirical Reviews**: Entire review is satirical performance where reviewer doesn't mean literal words
   *Special Scoring for Satirical Reviews:* 
   - If the entire review is satirical, extract the reviewer's ACTUAL opinion about the game beneath the sarcasm
   - Score should reflect what the reviewer truly thinks, not the literal words
   - Example: Dunkey's Zelda review is satirical praise disguised as criticism - the actual sentiment is highly positive
   - Look for context clues: reputation of game, reviewer's known style, consistency of hyperbolic language

6. **Reciprocity Bias**
   *Definition:* Inflated positivity due to receiving perks, gifts, or special access.
   *Triggers:* "generously gave me access", "got to preview", "gifted copy", "special treatment".

7. **Availability Bias**
   *Definition:* Reviewer overweights recent or vivid gameplay experiences.
   *Triggers:* "what sticks out", "I keep thinking about", "the moment I remember most".

8. **Halo Effect**
   *Definition:* A strong positive impression in one area affects the overall evaluation.
   *Triggers:* "because of the art", "due to the soundtrack", "everything feels great".

9. **Horn Effect**
   *Definition:* A strong negative impression in one area unfairly drags down the review.
   *Triggers:* "that one issue ruined it", "hard to enjoy anything else", "overshadowed".

10. **Selection Bias**
    *Definition:* The reviewer focuses on limited game aspects or modes, skewing evaluation.
    *Triggers:* "I only played", "didn't touch the campaign", "focused on one mode".

11. **Confirmation Bias**
    *Definition:* Selectively interpreting elements to support pre-existing opinions.
    *Triggers:* "exactly what I thought", "knew it would suck", "as expected".

12. **Bandwagon Bias**
    *Definition:* Opinion shaped by popular consensus or online discourse.
    *Triggers:* "everyone's saying", "the internet hates it", "Reddit loves this".

13. **Survivorship Bias**
    *Definition:* Ignoring flaws because only good parts were noticed or remembered.
    *Triggers:* "after a few patches it's fine", "you forget the bad", "just focus on what works".

14. **Emotional Bias**
    *Definition:* Judgment skewed by strong emotion (e.g., anger, euphoria).
    *Triggers:* "so frustrating", "absolutely furious", "completely hooked", "pure joy".

**Dynamic Scoring Guidelines:**
- For each bias, consider the frequency and intensity of trigger phrases to adjust the effect score dynamically.
- Correlate your confidence level with evidence strength (number and relevance of keyword matches) to adjust the effect score dynamically.
- If multiple biases frequently co-occur or interact, flag the interaction and adjust their combined effect accordingly.

For each detected bias, provide:
- Name of the bias
- Confidence (percentage between 40% and 100%)
- Effect on sentiment score (a number between -1.0 and 1.0)
- Why this bias matters for gamers
- Specific evidence from the transcript (quote, phrase, tone, or structural cue)
- **Evidence count**: Number of distinct occurrences of bias triggers found in the transcript

---

**IMPORTANT:** All sentiment analysis should focus on THE GAME being reviewed, not the review itself. 

**SATIRICAL REVIEW DETECTION:** If the review appears to be entirely satirical (consistent hyperbolic language, known satirical reviewer, classic/beloved game being "trashed"), extract the TRUE underlying opinion:
- Does the reviewer actually hate this beloved game, or are they performing satirical criticism?
- Look for context clues: game's reputation, reviewer's style, over-the-top language consistency
- Score should reflect the reviewer's genuine opinion, not the literal satirical words

**SARCASM SCORING GUIDANCE:**
- Occasional sarcasm in genuine reviews: No score adjustment, flag only
- Fully satirical reviews: Score the actual underlying opinion, not the satirical performance

---

### SATIRICAL REVIEW DECISION FRAMEWORK

**STEP 1: Satirical Detection**
Before analyzing sentiment, determine if this is a satirical performance:

**Satirical Indicators:**
- Extremely hyperbolic language throughout ("worst game ever", "developed by monkeys")
- Absurd claims that are obviously false ("$14 budget", "made in a weekend", "forced bankruptcy")
- Consistent over-the-top negativity about a well-known/classic game
- Comedic tone and exaggerated descriptions
- Claims that contradict known facts about successful games

**STEP 2: Scoring Logic**
- **If GENUINE review**: Score based on literal content
- **If SATIRICAL review**: 
  - Recognize this as comedic performance, not genuine criticism
  - For well-known games being satirically "trashed": Assume positive underlying sentiment (satirical praise)
  - Score should be 8-10 range (satirical criticism of classics usually indicates appreciation)
  - All fields must reflect the ACTUAL game quality, not the satirical performance

**STEP 3: Field Consistency**
All output fields must be consistent with the satirical/genuine determination:
- **sentimentScore**: Actual opinion (high for satirical classics)
- **sentimentSummary**: Should mention satirical nature but focus on actual game quality
- **sentimentSummaryFriendlyVerdict**: Recommend based on GAME quality, not review style
- **playerFit**: Based on GAME characteristics, not review style
- **pros/cons**: Extract any genuine points beneath the satire, or use known game strengths/weaknesses

---

### OUTPUT STRUCTURE

Return a single JSON object with these fields:

{
  "sentimentScore": number (0–10), // Score reflects the reviewer's actual opinion of the game, accounting for rhetorical devices like sarcasm
  "verdict": string,
  "sentimentSummary": string,  // Write a natural "reviewer take" about the reviewer's overall stance and attitude toward the game
  "sentimentSummaryFriendlyVerdict": string,  // Write a punchy recommendation about THE GAME ITSELF (not the review). Focus on whether the game is worth playing. Examples: "Worth playing for fans of the genre, but not a must-play for everyone." or "A timeless classic that every gamer should experience." Even if the review is satirical, extract the actual game recommendation.
  "pros": string[],
  "cons": string[],
  "biasIndicators": string[],
  "alsoRecommends": string[],
  "reviewSummary": string, // Write a clear, helpful summary of what the game is and what it offers - genre, key mechanics, setting, main features. Focus on the game itself, not what the reviewer discussed. Help readers understand what kind of game this is.
  "biasDetection": {
    "originalScore": number,
    "biasesDetected": BiasImpact[],
    "evidenceCount": number, // Total number of evidence pieces found across all detected biases
    "noBiasExplanation": string, // If no significant biases are detected, write a short, context-aware explanation (1–2 sentences) describing why the review appears balanced and objective. Reference the review's tone, evidence, or lack of emotional/habitual patterns. Mention if the reviewer presents both pros and cons, uses neutral language, or avoids strong emotional language.
    "biasInteractions": [{
      "biases": [string],
      "combinedEffect": number,
      "interactionRationale": string
    }],
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
  "legacyAndInfluence": {
    "justification": string,  
    // A brief explanation of the game's historical, artistic, or genre legacy — 
    // why this background or influence is relevant to how the game is received.

    "ideologicalThemes": string[],  
    // Key themes, motifs, or ideological leanings that shape the game's story, setting, 
    // or mechanics — including political, philosophical, or cultural undertones 
    // (e.g., anti-corporate narrative, collectivism, existential horror, etc.).

    "playerFit": {
      "aligned": string,  
      // Describes players who will likely connect with or appreciate this legacy and influence. 
      // Could be based on taste, background, genre preference, or thematic interest 
      // (e.g., "Fans of Eastern storytelling and mythological structure").

      "neutral": string,  
      // Describes players who may not strongly react to the legacy or ideological themes — 
      // they're not turned off, but it's not a driver of engagement either 
      // (e.g., "Players focused more on gameplay than narrative depth").

      "opposed": string  
      // Describes players who might push back against or be alienated by the game's legacy, 
      // cultural framing, or ideological themes — often due to personal values, 
      // genre expectations, or unfamiliarity 
      // (e.g., "Players averse to heavy political allegory or cultural specificity").
    }
  }
}

---

### SATIRICAL REVIEW EXAMPLE

**Input**: "Zelda Ocarina of Time is the worst game ever... developed by monkeys... $14 budget... Nintendo bankruptcy..."

**Correct Output**:
{
  "sentimentScore": 9.5,
  "verdict": "positive", 
  "sentimentSummary": "Reviewer employs satirical performance to demonstrate appreciation for this classic, using exaggerated negativity as comedic praise.",
  "sentimentSummaryFriendlyVerdict": "A timeless classic that every gamer should experience - one of the greatest games ever made.",
  "reviewSummary": "Zelda: Ocarina of Time is a 3D action-adventure game for N64 where you play as Link exploring Hyrule, solving puzzles in themed dungeons, and using musical melodies played on an ocarina to progress through the story and unlock new areas.",
  "pros": ["Revolutionary 3D gameplay", "Iconic music and sound design", "Innovative Z-targeting system", "Epic adventure and storytelling"],
  "cons": ["Some dated graphics by modern standards", "Occasional pacing issues"],
  "playerFit": {
    "aligned": "Adventure game fans and anyone interested in gaming history",
    "neutral": "Players who prefer modern graphics and mechanics", 
    "opposed": "Players who dislike older games or fantasy settings"
  }
}

---

### REGULAR REVIEW EXAMPLE

**Input**: "I really enjoyed this RPG. The combat system is engaging with lots of customization options. The story kept me hooked for 40+ hours. Graphics are decent but not groundbreaking. Some side quests felt repetitive though. Overall a solid 8/10 experience."

**Correct Output**:
{
  "sentimentScore": 8.0,
  "verdict": "positive",
  "sentimentSummary": "Reviewer expresses genuine enthusiasm for the game, appreciating its depth while acknowledging minor flaws in a balanced assessment.",
  "sentimentSummaryFriendlyVerdict": "A solid RPG worth playing for genre fans who enjoy deep customization and engaging storylines.",
  "reviewSummary": "Call of Duty: Modern Warfare is a first-person shooter featuring single-player campaign missions and multiplayer modes. Players engage in military combat scenarios using modern weapons and equipment across various global locations.",
  "pros": ["Engaging combat system", "Extensive customization options", "Compelling 40+ hour story"],
  "cons": ["Graphics not groundbreaking", "Some repetitive side quests"]
}

---

### Example Bias Detections

**Example: Halo Effect**

Transcript:
> "The art direction in this game is stunning — it just feels like a masterpiece overall."

Sentiment score: 8.5

Detected biases:
- **Halo Effect**
  Confidence: 75%
  Effect: +0.3
  Why it matters: A single impressive element may unduly inflate perception of unrelated areas.
  Evidence: "The art direction... feels like a masterpiece overall" implies art quality is skewing overall evaluation.

---

**Example: Horn Effect**

Transcript:
> "The UI is so awful I couldn't focus on anything else. Just ruined the experience."

Sentiment score: 3.5

Detected biases:
- **Horn Effect**
  Confidence: 80%
  Effect: –0.4
  Why it matters: A single flaw may cause the reviewer to disregard strengths elsewhere.
  Evidence: "ruined the experience" and "couldn't focus on anything else" suggest the flaw dominates evaluation.

---

**Example: Bandwagon Bias**

Transcript:
> "Everyone online is saying it's trash, and honestly, they're not wrong."

Sentiment score: 4.0

Detected biases:
- **Bandwagon Bias**
  Confidence: 70%
  Effect: –0.3
  Why it matters: Community consensus may sway individual judgment unfairly.
  Evidence: "Everyone online is saying it's trash" suggests reviewer is echoing public sentiment.

---

**Example: Availability Bias**

Transcript:
> "All I can remember are those few boss fights — they really stick out."

Sentiment score: 6.5

Detected biases:
- **Availability Bias**
  Confidence: 65%
  Effect: +0.2
  Why it matters: Memorable moments may distort overall impression.
  Evidence: "really stick out" shows vivid segments may outweigh broader issues.

---

**Example: Confirmation Bias**

Transcript:
> "I had a feeling this would be a buggy mess — and sure enough, it was just that."

Sentiment score: 3.5

Detected biases:
- **Confirmation Bias**
  Confidence: 80%
  Effect: –0.3
  Why it matters: Reviewer may selectively emphasize evidence confirming prior beliefs.
  Evidence: "had a feeling" and "sure enough" reflect pre-formed judgment.

---

**Example: Emotional Bias**

Transcript:
> "This game made me so angry I wanted to uninstall it on the spot."

Sentiment score: 2.5

Detected biases:
- **Emotional Bias**
  Confidence: 85%
  Effect: –0.4
  Why it matters: Intense emotion can override balanced analysis.
  Evidence: "so angry I wanted to uninstall" suggests emotion-led judgment.

---

Now analyze the following transcript segment:

Transcript:
"""
{TRANSCRIPT_CHUNK}
"""
`;

// === Updated unified prompt with implied bias detection instructions and dynamic legacyAndInfluence ===
// export const UNIFIED_LLM_PROMPT = `
// You are an expert assistant analyzing video game review transcripts for sentiment, reviewer bias, and legacy & influence. Your goal is to extract structured insights that power a bias-aware recommendation engine. Be precise, infer only when justified, and cite textual evidence.

// You must identify **both explicit and implied biases**, including tonal, habitual, or emotional indicators. If the bias is not clearly stated, inference is allowed — but **only** when supported by specific phrases or patterns. Provide **explanations** and **direct evidence** for each detected bias.

// ---

// 💡 COMMON BIAS CATEGORIES TO LOOK FOR:

// - **Nostalgia Bias**: Emotional callbacks to older titles or childhood memories.
// - **Franchise Bias / Studio Reputation Bias**: Inflated sentiment from brand loyalty or dev trust.
// - **Influencer/Sponsored Bias**: Overemphasis on praise, defensiveness, or disclaimers ("not sponsored").
// - **Reviewer Fatigue**: Signs of burnout or disengagement ("I've played too many lately", "nothing feels fresh").
// - **Genre Aversion**: Dislike rooted in genre, not quality ("not a fan of these types of games").
// - **Technical Criticism Bias**: Overemphasis on performance, bugs, or mechanics.
// - **Contrarian Bias**: Strong rejection of broadly praised games.
// - **Difficulty Bias**: Frustration caused by challenge or accessibility.
// - **Comparative Bias**: Score deflation due to comparisons ("X did it better").
// - **Cultural Bias**: Bias rooted in cultural preferences or values (e.g., certain cultural expectations around difficulty or gameplay pacing).

// You may add new bias types if you justify them clearly.

// ---

// 🔍 FOR EACH DETECTED BIAS:

// Include:
// - **name** (e.g. "nostalgia bias")
// - **severity** (low / moderate / high)
// - **explanation** (what pattern or phrasing triggered it)
// - **scoreInfluence** (number between -1 and +1)
// - **detectedIn** (e.g. "tone", "phrasing", "explicit statements", "examples")
// - **evidence** (direct phrases or short quotes)
// - **reviewerIntent** (explicit / implied / unclear)

// ---

// 📦 OUTPUT STRUCTURE:

// Return a single JSON object with the following:

// {
//   "sentimentScore": number (0–10),
//   "verdict": string,
//   "sentimentSummary": string,
//   "sentimentSummaryFriendlyVerdict": string,
//   "pros": string[],
//   "cons": string[],
//   "biasIndicators": string[],
//   "alsoRecommends": string[],
//   "reviewSummary": string,
//   "biasDetection": {
//     "originalScore": number,
//     "biasesDetected": BiasImpact[],
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
//   "legacyAndInfluence": {
//     "justification": string,  // Justification for legacy & influence, why it's relevant
//     "ideologicalThemes": string[],  // What cultural/ideological themes are highlighted
//     "playerFit": {
//       "aligned": string,  // Which audience aligns with this context (e.g., fans of gothic horror, etc.)
//       "neutral": string,  // Audience that is indifferent to cultural specifics
//       "opposed": string   // Audience that might reject this legacy & influence (e.g., players from different cultural backgrounds)
//     }
//   }
// }

// ---

// 📘 EXAMPLES:

// **Example 1 — Reviewer Fatigue**
// Transcript: "After playing so many open world games this year, I just didn't feel like finishing this one."
// Biases: [{
//   "name": "reviewer fatigue",
//   "severity": "moderate",
//   "scoreInfluence": -0.4,
//   "explanation": "Mentions burnout and lack of energy to continue.",
//   "detectedIn": ["phrasing"],
//   "evidence": ["didn't feel like finishing"],
//   "reviewerIntent": "implied"
// }]

// **Example 2 — Nostalgia & Studio Reputation**
// Transcript: "This feels like classic BioWare. They've never let me down."
// Biases: [{
//   "name": "nostalgia bias",
//   "severity": "moderate",
//   "scoreInfluence": 0.3,
//   "explanation": "References emotional legacy of previous titles.",
//   "detectedIn": ["tone", "phrasing"],
//   "evidence": ["feels like classic BioWare", "never let me down"],
//   "reviewerIntent": "implied"
// }]

// **Example 3 — legacy & influence**
// Transcript: "The game's difficulty is punishing, which is just how I like my platformers."
// Biases: [{
//   "name": "difficulty bias",
//   "severity": "moderate",
//   "scoreInfluence": 0.2,
//   "explanation": "Strong preference for difficult games, indicating legacy & influence for challenging gameplay.",
//   "detectedIn": ["tone"],
//   "evidence": ["punishing", "how I like my platformers"],
//   "reviewerIntent": "implied"
// }]
// ---

// Review Transcript:
// {{REVIEW_TRANSCRIPT}};
// `;

const SYSTEM_PROMPT = `You are an expert sentiment analysis assistant specialized in video game reviews. Extract nuanced sentiment, tone, reviewer biases, and key pros/cons based on both explicit statements and implied tone. Inferred insights are allowed if strongly implied. Do not invent details not supported by the text.`;

// --- Utility: dedupe helper ---
const dedupe = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim())));

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

// --- Helper: Generate fallback legacy & influence ---
export function generatelegacyAndInfluence(
  biasImpact: BiasImpact[],
): legacyAndInfluenceExplanation {
  if (!biasImpact.length) {
    return {
      justification: 'No significant ideological or cultural bias detected.',
      ideologicalThemes: [],
      playerFit: {
        aligned: 'positive',
        neutral: 'mixed',
        opposed: 'negative',
      },
    };
  }
  return {
    justification: `Score adjusted to reflect detected biases: ${biasImpact.map((b) => b.name).join(', ')}.`,
    ideologicalThemes: biasImpact.map((b) => b.name),
    playerFit: {
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
          { delay },
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
    { textLength: text.length, model: preferredModel, customPrompt: !!customPrompt },
    '[SENTIMENT] analyzeText called',
  );
  if (env.isTest || env.isProd) {
    logger.info({ first500chars: text.slice(0, 500) }, '[TRANSCRIPT] First 500 chars:\n');
  }
  // Log which model is being used for transcript analysis
  let model = preferredModel || 'gpt-4o';
  if (!['gpt-4o', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'gpt-4o';
  logger.info({ model }, '[TRANSCRIPT] Using OpenAI model');
  logger.info(
    { first500chars: (customPrompt || UNIFIED_LLM_PROMPT).slice(0, 500) },
    '[TRANSCRIPT] Using prompt (first 500 chars):',
  );
  if (env.DISABLE_OPENAI) {
    logger.info({ model }, '[LLM] OpenAI disabled via DISABLE_OPENAI env var');
    return {
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
      legacyAndInfluence: null,
    };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // --- Prompt selection logic ---
  const promptToUse = customPrompt || UNIFIED_LLM_PROMPT;
  logger.info(
    { promptLength: promptToUse.length, textLength: text.length },
    '[TRANSCRIPT] Prompt length: chars, transcript length: chars',
  );

  // --- Chunking logic ---
  const MAX_CHUNK_LENGTH = 6000;
  const transcriptChunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
    transcriptChunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
  }
  logger.info(
    { transcriptChunksLength: transcriptChunks.length },
    '[TRANSCRIPT] Transcript split into chunk(s)',
  );

  // --- Helper to process a single chunk ---
  const REQUIRED_FIELDS = [
    'sentimentScore',
    'verdict',
    'sentimentSummary',
    'sentimentSummaryFriendlyVerdict',
    'biasIndicators',
    'alsoRecommends',
    'pros',
    'cons',
    'reviewSummary',
  ];
  const getDefaultForField = (field: string) => {
    switch (field) {
      case 'sentimentScore':
        return 5;
      case 'verdict':
        return 'mixed';
      case 'sentimentSummary':
        return 'Mixed';
      case 'sentimentSummaryFriendlyVerdict':
        return 'Mixed';
      case 'biasIndicators':
      case 'alsoRecommends':
      case 'pros':
      case 'cons':
        return [];
      case 'reviewSummary':
        return 'No review summary available.';
      default:
        return null;
    }
  };
  const tryParseJson = (raw: string): any | null => {
    const match = raw.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(match ? match[0] : raw);
      // Only require at least one core field
      if (!('sentimentScore' in parsed) && !('sentimentSummary' in parsed)) {
        logger.error({ raw }, '[LLM] Missing core fields in LLM output');
        return null;
      }
      // Fill in missing fields with defaults
      for (const field of REQUIRED_FIELDS) {
        if (!(field in parsed)) parsed[field] = getDefaultForField(field);
      }
      // Remove satirical field if LLM included it - we determine this ourselves
      if ('satirical' in parsed) {
        delete parsed.satirical;
      }
      return parsed;
    } catch (err) {
      const errorObj = err as any;
      logger.error({ message: errorObj.message, stack: errorObj.stack }, '[LLM] JSON parse error:');
      return null;
    }
  };

  // --- Fallback prompt: much simpler, only core fields ---
  const buildFallbackPrompt = (chunk: string) =>
    `You are an expert at extracting sentiment and key points from video game review transcripts. Return a JSON object with these fields only:\n{\n  "sentimentScore": number (0-10),\n  "sentimentSummary": string,\n  "pros": string[],\n  "cons": string[]\n}\nTranscript:\n"""${chunk}"""`;

  const processChunk = async (chunk: string, prompt: string, isFallback = false): Promise<any> => {
    const contextInfo = [
      gameTitle ? `Game Title: ${gameTitle}` : '',
      creatorName ? `Creator: ${creatorName}` : '',
      // Add context for well-known games to help with satirical detection
      gameTitle && isWellKnownClassicGame(gameTitle)
        ? `Note: This is a widely acclaimed classic game`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userMessage = `${prompt}\n\n${contextInfo}\n\nTranscript:\n${chunk}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    // Try gpt-4o, fallback to gpt-4o if it fails
    let lastError = null;
    for (const tryModel of [model, model === 'gpt-4o' ? 'gpt-4o' : null]) {
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
        logger.info({ raw }, `[LLM] Raw response (${tryModel}${isFallback ? ' Fallback' : ''}):`);
        const parsed = tryParseJson(raw);
        logger.info({ parsed }, `[LLM] Parsed JSON (${tryModel}${isFallback ? ' Fallback' : ''}):`);
        if (parsed) return parsed;
      } catch (err) {
        const errorObj = err as any;
        logger.error(
          {
            message: errorObj.message,
            stack: errorObj.stack,
            model: tryModel,
            isFallback,
            ...(errorObj.response && {
              response: errorObj.response.data || errorObj.response.status,
            }),
          },
          `[LLM] Completion error with model ${tryModel}${isFallback ? ' Fallback' : ''}`,
        );
        lastError = err;
      }
    }
    return null;
  };

  // --- Process all chunks and aggregate ---
  const results: Partial<SentimentResult>[] = [];
  for (const chunk of transcriptChunks) {
    let result = await processChunk(chunk, promptToUse);
    if (!result || (!result.sentimentScore && !result.sentimentSummary)) {
      logger.warn(
        '[LLM] Primary prompt failed or missing core fields — retrying with fallback prompt.',
      );
      logger.info('[LLM] Retrying with fallback prompt (short, core fields only).');
      result = await processChunk(chunk, buildFallbackPrompt(chunk), true);
    }
    // If fallback also fails, salvage what we can from the primary attempt
    if (!result) {
      logger.warn('[LLM] Both primary and fallback prompt failed — returning minimal defaults.');
      result = { sentimentScore: 5 };
    }
    // Fill in missing fields with defaults
    for (const field of REQUIRED_FIELDS) {
      if (!(field in result)) result[field] = getDefaultForField(field);
    }
    results.push(result);
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

  // Extract noBiasExplanation from LLM response if available
  const extractNoBiasExplanation = (): string | null => {
    for (const result of results) {
      if (result && typeof result === 'object') {
        // Check if biasDetection.noBiasExplanation exists
        const llmResult = result as LLMRawResponse;
        if (llmResult.biasDetection?.noBiasExplanation) {
          return llmResult.biasDetection.noBiasExplanation;
        }
        // Also check at root level in case LLM returns it there
        if (llmResult.noBiasExplanation) {
          return llmResult.noBiasExplanation;
        }
      }
    }
    return null;
  };

  const sentimentScore =
    results.find((r) => typeof r.sentimentScore === 'number')?.sentimentScore ?? 5;
  const verdict = aggregate('verdict') as string | null;
  const sentimentSummary = aggregate('sentimentSummary') as string | null;
  const sentimentSummaryFriendlyVerdict = aggregate('sentimentSummaryFriendlyVerdict') as
    | string
    | null;
  // --- Deduplicate and canonicalize biasIndicators ---
  let biasIndicators = aggregate('biasIndicators', true) as string[];
  biasIndicators = dedupe((biasIndicators || []).map(mapToCanonicalBias));
  // --- Deduplicate alsoRecommends, pros, cons ---
  const alsoRecommends = dedupe((aggregate('alsoRecommends', true) as string[]) || []);
  const pros = dedupe((aggregate('pros', true) as string[]) || []);
  const cons = dedupe((aggregate('cons', true) as string[]) || []);
  const reviewSummary = aggregate('reviewSummary') as string | null;
  const noBiasExplanationFromLLM = extractNoBiasExplanation();

  // --- Type guard for legacyAndInfluence ---
  const legacyAndInfluence =
    results.find(
      (r): r is { legacyAndInfluence: legacyAndInfluenceExplanation } =>
        typeof r === 'object' &&
        r !== null &&
        'legacyAndInfluence' in r &&
        r.legacyAndInfluence !== undefined,
    )?.legacyAndInfluence || null;

  // Always provide safe defaults if LLM output is empty/null
  const result: SentimentResult = {
    sentimentScore:
      typeof sentimentScore === 'number' && sentimentScore >= 0 && sentimentScore <= 10
        ? sentimentScore
        : 5,
    verdict: toStringOrNull(verdict) || 'mixed',
    sentimentSummary: toStringOrNull(sentimentSummary) || 'Mixed',
    sentimentSummaryFriendlyVerdict: toStringOrNull(sentimentSummaryFriendlyVerdict) || 'Mixed',
    biasIndicators,
    alsoRecommends,
    pros,
    cons,
    reviewSummary: toStringOrNull(reviewSummary) || 'No review summary available.',
    legacyAndInfluence,
    noBiasExplanationFromLLM: noBiasExplanationFromLLM || undefined,
    satirical: checkIfFullySatirical(results, biasIndicators),
  };
  if (!result.sentimentSummary || result.sentimentSummary === 'No clear summary detected.') {
    logger.warn('[LLM] Warning: summary is missing, using fallback (sentimentSummary or default).');
  }

  // Log a warning if the LLM output was mostly empty
  const allEmpty = Object.values(result).every(
    (v) => v === null || (Array.isArray(v) && v.length === 0),
  );
  if (allEmpty) {
    logger.warn('[LLM] Warning: LLM returned mostly empty result, using safe defaults.', result);
  }

  logger.info({ results }, '[SENTIMENT] analyzeText results:');
  logger.info({ result }, '[SENTIMENT] analyzeText final result:');
  logger.info({ biasIndicators }, '[SENTIMENT] Aggregated biasIndicators:');
  logger.info({ alsoRecommends }, '[SENTIMENT] Aggregated alsoRecommends:');
  logger.info({ pros }, '[SENTIMENT] Aggregated pros:');
  logger.info({ cons }, '[SENTIMENT] Aggregated cons:');
  return result;
};

export type BiasObject = {
  name: string;
  severity: 'low' | 'moderate' | 'high';
  impactOnExperience: string;
  scoreInfluence: number; // positive or negative
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
  try {
    logger.info(
      { textLength: text.length, model: preferredModel, customPrompt: !!customPrompt },
      '[SENTIMENT] analyzeTextWithBiasAdjustmentFull called',
    );
    const sentiment = await analyzeText(text, preferredModel, customPrompt, gameTitle, creatorName);
    let biasesDetected: BiasImpact[] = [];
    let noBiasExplanation: string | undefined = undefined;
    if (sentiment.biasIndicators && sentiment.biasIndicators.length > 0) {
      biasesDetected = mapBiasLabelsToObjects(
        sentiment.biasIndicators,
        sentiment.reviewSummary || '',
        sentiment.pros,
        sentiment.cons,
      );
      // --- Bias filtering: confidenceScore >= 0.4 and evidence.length > 0 ---
      biasesDetected = biasesDetected.filter(
        (b) =>
          (typeof b.confidenceScore === 'number' ? b.confidenceScore >= 0.4 : true) &&
          Array.isArray(b.evidence) &&
          b.evidence.length > 0,
      );
      if (biasesDetected.length === 0) {
        // Use LLM's explanation if available, otherwise fallback
        noBiasExplanation =
          sentiment.noBiasExplanationFromLLM || 'No clear biases detected in this segment.';
      }
    } else {
      // No bias indicators at all - use LLM's explanation if available
      noBiasExplanation =
        sentiment.noBiasExplanationFromLLM || 'No clear biases detected in this segment.';
    }
    // --- Score normalization and logging ---

    // Calculate evidenceCount from biasesDetected
    const calculatedEvidenceCount = biasesDetected.reduce(
      (total, bias) => total + (bias.evidence?.length || 0),
      0,
    );

    // Try to extract evidenceCount from LLM response if available in sentiment
    const evidenceCount = (sentiment as any).evidenceCount || calculatedEvidenceCount;

    const biasDetection: BiasDetectionPhaseOutput = {
      originalScore: sentiment.sentimentScore ?? 5,
      biasesDetected,
      evidenceCount,
      ...(noBiasExplanation ? { noBiasExplanation } : {}),
    };
    const totalScoreAdjustmentRaw = biasesDetected.reduce(
      (sum, b) => sum + (b.adjustedInfluence || 0),
      0,
    );
    const biasAdjustedScoreRaw = +(biasDetection.originalScore + totalScoreAdjustmentRaw);
    const biasAdjustedScore = roundScoreForDisplay(biasAdjustedScoreRaw);
    const totalScoreAdjustment = roundScoreForDisplay(totalScoreAdjustmentRaw);
    if (biasDetection.originalScore !== biasAdjustedScore) {
      logger.info(
        { original: biasDetection.originalScore, adjusted: biasAdjustedScore },
        '[SENTIMENT] Score normalization:',
      );
    }
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
    // If LLM did not provide legacyAndInfluence, synthesize and set it inside sentiment
    if (!sentiment.legacyAndInfluence) {
      sentiment.legacyAndInfluence = generatelegacyAndInfluence(biasesDetected);
    }
    logger.info(
      { sentiment, biasDetection, biasAdjustment, sentimentSnapshot },
      '[SENTIMENT] analyzeTextWithBiasAdjustmentFull output:',
    );
    return {
      sentiment,
      biasDetection,
      biasAdjustment,
      sentimentSnapshot,
    };
  } catch (err: any) {
    logger.error(
      {
        message: err.message,
        stack: err.stack,
        textLength: text?.length,
        preferredModel,
        gameTitle,
        creatorName,
      },
      '[SENTIMENT] Error in analyzeTextWithBiasAdjustmentFull',
    );
    throw err;
  }
};

// --- Mock output example ---
export const MOCK_FULL_BIAS_SCORING_OUTPUT: FullBiasScoringOutput = {
  sentiment: {
    sentimentScore: 9.2,
    verdict: 'positive',
    sentimentSummary: 'Highly positive',
    sentimentSummaryFriendlyVerdict: 'Highly positive',
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
    legacyAndInfluence: {
      justification:
        'Based on the review transcript, certain ideological themes and narrative framings may influence audience perception.',
      ideologicalThemes: ['representation', 'studio reputation'],
      playerFit: {
        aligned:
          'Likely to resonate strongly with fans of inclusive narratives and franchise loyalists.',
        neutral: 'May appreciate the technical and narrative strengths, but not be deeply moved.',
        opposed: 'Could be critical of perceived ideological or franchise-driven elements.',
      },
    },
    satirical: false,
  },
  biasDetection: {
    originalScore: 9.2,
    evidenceCount: 3,
    biasesDetected: [
      {
        name: 'nostalgia bias',
        severity: 'moderate',
        impactOnExperience:
          'Nostalgia may cause the reviewer to overlook flaws or overrate positive aspects.',
        baseScoreInfluence: 0.5,
        maxScoreInfluence: 0.75,
        explanation:
          'Nostalgia bias detected; reviewer may rate higher due to fondness for the franchise.',
        confidenceScore: 0.8,
        adjustedInfluence: 0.32,
        detectedIn: ['tone', 'phrasing'],
        reviewerIntent: 'implied',
        evidence: ['feels like classic BioWare', 'never let me down'],
        biasInteractionsApplied: [
          {
            biases: ['nostalgia bias', 'franchise bias'],
            multiplier: 1.4,
            influenceAdded: 0.08,
          },
        ],
      },
      {
        name: 'studio reputation bias',
        severity: 'moderate',
        impactOnExperience: 'Studio reputation may inflate expectations and perceived quality.',
        baseScoreInfluence: 0.3,
        maxScoreInfluence: 0.39,
        explanation: 'Studio reputation bias detected.',
        confidenceScore: 0.7,
        adjustedInfluence: 0.28,
        detectedIn: ['tone'],
        reviewerIntent: 'implied',
        evidence: ['never let me down'],
        biasInteractionsApplied: [
          {
            biases: ['nostalgia bias', 'franchise bias'],
            multiplier: 1.4,
            influenceAdded: 0.08,
          },
        ],
      },
    ],
    noBiasExplanation: 'No clear biases detected in this segment.',
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
  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    let model = preferredModel || 'gpt-4o';
    if (!['gpt-4o', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) model = 'gpt-4o';
    const prompt = `Summarize what this video is about and list any key notes or important points. Return a JSON object with two fields: summary (string), keyNotes (array of strings).`;
    const messages = [
      { role: 'system', content: 'You are an expert assistant for summarizing YouTube videos.' },
      { role: 'user', content: prompt },
      { role: 'user', content: `Transcript:\n${text}` },
    ];
    let lastError = null;
    for (const tryModel of [model, model === 'gpt-4o' ? 'gpt-4o' : null]) {
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
    throw new Error(`Both gpt-4o and gpt-4o failed for analyzeGeneralSummary: ${lastError}`);
  } catch (err: any) {
    logger.error(
      { message: err.message, stack: err.stack, textLength: text?.length, preferredModel },
      '[SENTIMENT] Error in analyzeGeneralSummary',
    );
    throw err;
  }
};

// Helper function to determine if review is fully satirical vs just containing sarcasm
const checkIfFullySatirical = (
  results: Partial<SentimentResult>[],
  biasIndicators: string[],
): boolean => {
  // Check for sarcasm in bias indicators
  const hasSarcasm = biasIndicators.some((bias) => bias.toLowerCase().includes('sarcasm'));

  // Check for indicators of full satirical review from LLM responses
  for (const result of results) {
    if (result && typeof result === 'object') {
      const llmResult = result as LLMRawResponse;

      // Look for LLM explicitly identifying satirical nature
      const reviewSummary = llmResult.reviewSummary?.toLowerCase() || '';
      const sentimentSummary = llmResult.sentimentSummary?.toLowerCase() || '';
      const verdict = llmResult.verdict?.toLowerCase() || '';
      const noBiasExplanation = llmResult.noBiasExplanationFromLLM?.toLowerCase() || '';

      // Combine all text fields for easier searching
      const allText = `${reviewSummary} ${sentimentSummary} ${verdict} ${noBiasExplanation}`;

      // Look for key satirical patterns
      const satiricalPatterns = [
        'satirical',
        'satirical review',
        'satirical performance',
        'satirical approach',
        'satirical and comedic',
        'comedic performance',
        'comedic intent',
        'satirical critique',
        'employs satirical',
        'entirely satirical',
        'satirical criticism',
      ];

      const foundPatterns = satiricalPatterns.filter((pattern) => allText.includes(pattern));

      // Flag as satirical if:
      // 1. Has sarcasm bias AND at least one satirical pattern, OR
      // 2. Has multiple satirical patterns (strong evidence)
      const shouldBeSatirical =
        (hasSarcasm && foundPatterns.length > 0) || foundPatterns.length >= 2;

      if (shouldBeSatirical) {
        return true;
      }
    }
  }

  return false;
};

// Helper function to identify well-known classic games
const isWellKnownClassicGame = (title: string): boolean => {
  const classicGames = [
    'zelda',
    'ocarina of time',
    'majora',
    'breath of the wild',
    'tears of the kingdom',
    'mario',
    'super mario',
    'mario 64',
    'mario kart',
    'mario odyssey',
    'metroid',
    'final fantasy',
    'chrono trigger',
    'secret of mana',
    'half-life',
    'portal',
    'team fortress',
    'counter-strike',
    'doom',
    'quake',
    'wolfenstein',
    'sonic',
    'mega man',
    'castlevania',
    'contra',
    'street fighter',
    'mortal kombat',
    'tekken',
    'pokemon',
    'red',
    'blue',
    'gold',
    'silver',
    'dark souls',
    'bloodborne',
    'elden ring',
    'witcher',
    'skyrim',
    'oblivion',
    'morrowind',
    'gta',
    'grand theft auto',
    'red dead',
    'minecraft',
    'tetris',
    'pac-man',
  ];

  const lowerTitle = title.toLowerCase();
  return classicGames.some((classic) => lowerTitle.includes(classic));
};
