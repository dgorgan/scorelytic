const eqMock = jest.fn(() => Promise.resolve({ data: [{}], error: null }));
const updateMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ update: updateMock }));

const mockCreate = jest.fn().mockResolvedValue({
  choices: [
    { message: { content: JSON.stringify({ summary: 'Mock summary', sentimentScore: 7, verdict: 'positive' }) } }
  ]
});
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
}));

import { analyzeReviewText } from '../llmSentiment';
import { SentimentResult } from '../../services/sentimentService';

jest.mock('../../config/database', () => ({
  supabase: { from: fromMock }
}));

describe('analyzeReviewText', () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify({ summary: 'Mock summary', sentimentScore: 7, verdict: 'positive' }) } }
      ]
    });
  });

  it('returns mock sentiment and updates review', async () => {
    const transcript = 'This is a test transcript.';
    const reviewId = 'test-review-id';
    const result = await analyzeReviewText(transcript, reviewId);
    expect(result).toEqual({
      summary: expect.any(String),
      sentimentScore: expect.any(Number),
      verdict: expect.any(String)
    });
    expect(fromMock).toHaveBeenCalledWith('reviews');
    expect(updateMock).toHaveBeenCalledWith({ sentimentSummary: JSON.stringify(result) });
    expect(eqMock).toHaveBeenCalledWith('id', reviewId);
  });

  it('throws if OpenAI response is malformed', async () => {
    mockCreate.mockResolvedValue({ choices: [ { message: { content: '{}' } } ] });
    await expect(analyzeReviewText('Bad transcript', 'bad-id')).rejects.toThrow('Malformed LLM response');
  });

  it('throws if OpenAI errors', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    await expect(analyzeReviewText('fail', 'fail-id')).rejects.toThrow('OpenAI sentiment analysis failed: API fail');
  });
});
