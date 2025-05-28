jest.mock('openai');

import { analyzeText } from '../sentimentService';

const mockCreate = jest.fn();
const mockOpenAI = require('openai');
mockOpenAI.mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate
    }
  }
}));

describe('analyzeText', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns sentiment result for valid text', async () => {
    const fullMockResult = {
      summary: 'Test summary',
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      biasIndicators: ['contrarian'],
      alsoRecommends: ['Game Y'],
      pros: ['Interesting mechanics'],
      cons: ['Bugs'],
      reviewSummary: 'A nuanced review.'
    };
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify(fullMockResult) } }
      ]
    });
    const result = await analyzeText('This is a test.');
    expect(result).toEqual(fullMockResult);
  });

  it('throws on malformed LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: '{}' } }
      ]
    });
    await expect(analyzeText('bad')).rejects.toThrow('LLM returned empty or invalid response');
  });

  it('throws on OpenAI error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    await expect(analyzeText('fail')).rejects.toThrow('OpenAI sentiment analysis failed: API fail');
  });
}); 