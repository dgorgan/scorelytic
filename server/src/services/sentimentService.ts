import OpenAI from 'openai';

export type SentimentResult = {
  summary: string;
  sentimentScore: number;
  verdict: string;
  sentimentSummary: string;
  biasIndicators: string[];
  alsoRecommends: string[];
  pros: string[];
  cons: string[];
  reviewSummary: string;
};

export const getEmbedding = async (text: string, model: string = 'text-embedding-ada-002'): Promise<number[]> => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await openai.embeddings.create({
    model,
    input: text
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
  'Positive with platform bias'
];

const BIAS_LABELS = [
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
  'franchise bias'
];

// LLM prompt config and few-shot examples
export const DEFAULT_LLM_PROMPT = `Analyze the following review transcript and return a JSON object with these fields: summary (string), sentimentScore (0-10, number), verdict ("positive", "negative", or "mixed"), sentimentSummary (string, use ONLY one of these labels: ["Overwhelmingly positive", "Very positive", "Mostly positive", "Mixed", "Neutral", "Negative", "Contrarian", "Positive (influencer bias)", "Positive (sponsored)", "Mixed to negative", "Mixed (genre aversion)", "Mixed (reviewer fatigue)", "Positive with platform bias"]), biasIndicators (array of strings: use ONLY these labels: ["nostalgia bias", "influencer bias", "sponsored bias", "contrarian", "genre aversion", "reviewer fatigue", "technical criticism", "platform bias", "accessibility bias", "story-driven bias", "franchise bias"], and match the style/wording of this list as closely as possible), alsoRecommends (array of strings), pros (array of strings), cons (array of strings), reviewSummary (string, a 1-2 sentence or paragraph TLDR/overview of the review for gamers/users). For each field, if it is not mentioned or cannot be inferred from the transcript, return null (for strings/numbers) or an empty array (for arrays). Do not guess or hallucinate. Be as accurate and nuanced as possible.`;

export const FEW_SHOT_EXAMPLES = [
  {
    transcript: "This game blew me away. The story was incredible, and I couldn't put it down. The only downside was some minor bugs.",
    expected: {
      sentimentScore: 9,
      verdict: "positive",
      sentimentSummary: "Overwhelmingly positive",
      pros: ["incredible story", "engaging gameplay"],
      cons: ["minor bugs"],
      biasIndicators: [],
      alsoRecommends: [],
      reviewSummary: "A must-play with a fantastic story, only held back by a few bugs."
    }
  },
  // Add more few-shot examples as needed
];

export const analyzeText = async (
  text: string,
  model: string = 'gpt-3.5-turbo',
  customPrompt?: string,
  labels: string[] = SENTIMENT_LABELS
): Promise<SentimentResult> => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const labelList = labels.map(l => `"${l}"`).join(', ');
  const biasList = BIAS_LABELS.map(l => `"${l}"`).join(', ');
  const prompt = customPrompt || `Analyze the following review transcript and return a JSON object with these fields: summary (string), sentimentScore (0-10, number), verdict ("positive", "negative", or "mixed"), sentimentSummary (string, use ONLY one of these labels: [${labelList}]), biasIndicators (array of strings: use ONLY these labels: [${biasList}], and match the style/wording of this list as closely as possible), alsoRecommends (array of strings), pros (array of strings), cons (array of strings), reviewSummary (string, a 1-2 sentence or paragraph TLDR/overview of the review for gamers/users). For each field, if it is not mentioned or cannot be inferred from the transcript, return null (for strings/numbers) or an empty array (for arrays). Do not guess or hallucinate. Be as accurate and nuanced as possible.\nTranscript:\n${text}`;
  console.debug('[LLM] SentimentService prompt:', prompt);
  let llmResult: SentimentResult;
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert sentiment analysis assistant. Pay special attention to identifying explicit or implicit reviewer bias.' },
        { role: 'user', content: prompt }
      ],
      ...(supportsJsonResponse(model) ? { response_format: { type: 'json_object' } } : {})
    });
    console.debug('[LLM] SentimentService OpenAI raw response:', JSON.stringify(completion));
    let content = completion.choices[0]?.message?.content?.trim() || '{}';
    if (!supportsJsonResponse(model)) {
      // Try to extract first JSON object from text
      const match = content.match(/\{[\s\S]*\}/);
      if (match) content = match[0];
    }
    llmResult = JSON.parse(content);
    console.debug('[LLM] SentimentService parsed result:', llmResult);
    // Accept null for string/number fields and [] for arrays if not mentioned
    const isStringOrNull = (v: unknown): boolean => typeof v === 'string' || v === null;
    const isNumberOrNull = (v: unknown): boolean => typeof v === 'number' || v === null;
    const isArray = (v: unknown): boolean => Array.isArray(v);
    if (!isStringOrNull(llmResult.summary)) throw new Error('Malformed LLM response: summary');
    if (!isNumberOrNull(llmResult.sentimentScore)) throw new Error('Malformed LLM response: sentimentScore');
    if (!isStringOrNull(llmResult.verdict)) throw new Error('Malformed LLM response: verdict');
    if (!isStringOrNull(llmResult.sentimentSummary)) throw new Error('Malformed LLM response: sentimentSummary');
    if (!isArray(llmResult.biasIndicators)) throw new Error('Malformed LLM response: biasIndicators');
    if (!isArray(llmResult.alsoRecommends)) throw new Error('Malformed LLM response: alsoRecommends');
    if (!isArray(llmResult.pros)) throw new Error('Malformed LLM response: pros');
    if (!isArray(llmResult.cons)) throw new Error('Malformed LLM response: cons');
    if (!isStringOrNull(llmResult.reviewSummary)) throw new Error('Malformed LLM response: reviewSummary');
  } catch (err: any) {
    console.debug('[LLM] SentimentService error:', err);
    throw new Error(`OpenAI sentiment analysis failed: ${err.message || err}`);
  }
  return llmResult;
}; 