import { analyzeGeneralSummary } from '@/services/sentiment/sentimentService';
import logger from '@/logger';

interface PipelineContext {
  [key: string]: any;
}

export const generalAnalysisStep = async (
  input: { transcript: string; model?: string },
  context: PipelineContext,
) => {
  try {
    if (!input.transcript || !input.transcript.trim()) {
      context.generalResult = undefined;
      return undefined;
    }
    const generalResult = await analyzeGeneralSummary(input.transcript, input.model || 'gpt-4o');
    context.generalResult = generalResult;
    return generalResult;
  } catch (err: any) {
    const errorObj = err as any;
    logger.error('[PIPELINE] Error in generalAnalysisStep', {
      message: errorObj.message,
      stack: errorObj.stack,
    });
    throw err;
  }
};
