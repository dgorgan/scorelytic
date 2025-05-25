const eqMock = jest.fn(() => Promise.resolve({ data: [{}], error: null }));
const updateMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ update: updateMock }));

jest.mock('../../config/database', () => ({
  supabase: { from: fromMock }
}));

import { analyzeTranscript, SentimentResult } from '../llmSentiment';

const db = require('../../config/database');

describe('analyzeTranscript', () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
  });

  it('returns mock sentiment and updates review', async () => {
    const transcript = 'This is a test transcript.';
    const reviewId = 'test-review-id';
    const result = await analyzeTranscript(transcript, reviewId);
    expect(result).toEqual({
      summary: expect.any(String),
      sentimentScore: expect.any(Number),
      verdict: expect.any(String)
    });
    expect(fromMock).toHaveBeenCalledWith('reviews');
    expect(updateMock).toHaveBeenCalledWith({ sentimentSummary: JSON.stringify(result) });
    expect(eqMock).toHaveBeenCalledWith('id', reviewId);
  });
}); 