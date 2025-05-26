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

export const analyzeText = async (
  text: string,
  model: string = 'gpt-3.5-turbo',
  customPrompt?: string
): Promise<SentimentResult> => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = customPrompt || `Analyze the following review transcript and return a JSON object with these fields: summary (string), sentimentScore (0-10, number), verdict ("positive", "negative", or "mixed"), sentimentSummary (string, e.g. "Overwhelmingly positive", "Mixed", etc.), biasIndicators (array of strings: list any explicit or implicit reviewer biases, preferences, or affiliations you can infer from the transcript, e.g., "prefers story-driven games", "fan of FromSoftware", "critical of technical issues", "not a fan of Soulslikes"; if none, return an empty array), alsoRecommends (array of strings), pros (array of strings), cons (array of strings), reviewSummary (string, a 1-2 sentence or paragraph TLDR/overview of the review for gamers/users). Be as accurate and nuanced as possible.\nTranscript:\n${text}`;
  console.debug('[LLM] SentimentService prompt:', prompt);
  let llmResult: SentimentResult;
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert sentiment analysis assistant. Pay special attention to identifying explicit or implicit reviewer bias.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });
    console.debug('[LLM] SentimentService OpenAI raw response:', JSON.stringify(completion));
    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    llmResult = JSON.parse(content);
    console.debug('[LLM] SentimentService parsed result:', llmResult);
    if (!llmResult.summary || typeof llmResult.sentimentScore !== 'number' || !llmResult.verdict || !llmResult.sentimentSummary || !Array.isArray(llmResult.biasIndicators) || !Array.isArray(llmResult.alsoRecommends) || !Array.isArray(llmResult.pros) || !Array.isArray(llmResult.cons) || !llmResult.reviewSummary) {
      throw new Error('Malformed LLM response');
    }
  } catch (err: any) {
    console.debug('[LLM] SentimentService error:', err);
    throw new Error(`OpenAI sentiment analysis failed: ${err.message || err}`);
  }
  return llmResult;
}; 