import { supabase } from '../config/database';

export type SentimentResult = {
  summary: string;
  sentimentScore: number;
  verdict: string;
};

// Mocked OpenAI call for now
const mockOpenAIResponse = {
  summary: 'This game is fun and engaging, but has some flaws.',
  sentimentScore: 8,
  verdict: 'positive',
};

export const analyzeTranscript = async (transcript: string, reviewId: string): Promise<SentimentResult> => {
  // In real impl, call OpenAI API here
  const llmResult: SentimentResult = { ...mockOpenAIResponse };

  // Store result in review.sentimentSummary (for now, as stringified JSON)
  await supabase
    .from('reviews')
    .update({ sentimentSummary: JSON.stringify(llmResult) })
    .eq('id', reviewId);

  return llmResult;
}; 