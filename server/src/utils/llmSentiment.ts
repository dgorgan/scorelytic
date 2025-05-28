import { supabase } from '@/config/database';
import { analyzeText, SentimentResult } from '@/services/sentiment';

export const analyzeReviewText = async (transcript: string, reviewId: string): Promise<SentimentResult> => {
  const llmResult = await analyzeText(transcript);
  await supabase
    .from('reviews')
    .update({ sentimentSummary: JSON.stringify(llmResult) })
    .eq('id', reviewId);
  return llmResult;
}; 

