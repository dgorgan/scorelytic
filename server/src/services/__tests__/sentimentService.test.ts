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
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify({ summary: 'Test summary', sentimentScore: 5, verdict: 'mixed' }) } }
      ]
    });
    const result = await analyzeText('This is a test.');
    expect(result).toEqual({ summary: 'Test summary', sentimentScore: 5, verdict: 'mixed' });
  });

  it('throws on malformed LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: '{}' } }
      ]
    });
    await expect(analyzeText('bad')).rejects.toThrow('Malformed LLM response');
  });

  it('throws on OpenAI error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    await expect(analyzeText('fail')).rejects.toThrow('OpenAI sentiment analysis failed: API fail');
  });
}); 