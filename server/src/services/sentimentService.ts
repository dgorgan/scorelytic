import OpenAI from 'openai';

export type SentimentResult = {
  summary: string;
  sentimentScore: number;
  verdict: string;
};

export const analyzeText = async (text: string): Promise<SentimentResult> => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Analyze the following text and return a JSON object with these fields: summary (string), sentimentScore (0-10, number), verdict ("positive", "negative", or "mixed").\nText:\n${text}`;
  console.debug('[LLM] SentimentService prompt:', prompt);
  let llmResult: SentimentResult;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert sentiment analysis assistant.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });
    console.debug('[LLM] SentimentService OpenAI raw response:', JSON.stringify(completion));
    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    llmResult = JSON.parse(content);
    console.debug('[LLM] SentimentService parsed result:', llmResult);
    if (!llmResult.summary || typeof llmResult.sentimentScore !== 'number' || !llmResult.verdict) {
      throw new Error('Malformed LLM response');
    }
  } catch (err: any) {
    console.debug('[LLM] SentimentService error:', err);
    throw new Error(`OpenAI sentiment analysis failed: ${err.message || err}`);
  }
  return llmResult;
}; 