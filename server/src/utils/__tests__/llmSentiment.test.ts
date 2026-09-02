const eqMock = jest.fn(() => Promise.resolve({ data: [{}], error: null }));
const updateMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ update: updateMock }));

const fullMockResult = {
  alsoRecommends: [],
  biasIndicators: ['story-driven bias'],
  cons: ['Too short'],
  legacyAndInfluence: null,
  pros: ['Great story'],
  reviewSummary: 'A solid review.',
  sentimentScore: 7,
  sentimentSummary: 'Mixed',
  sentimentSummaryFriendlyVerdict: 'Mixed',
  verdict: 'mixed',
};
const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify(fullMockResult) } }],
});
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

import { analyzeReviewText } from '../llmSentiment';

jest.mock('@/config/database', () => ({
  supabase: { from: fromMock },
}));

describe('analyzeReviewText', () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fullMockResult) } }],
    });
  });

  it('returns mock sentiment and updates review', async () => {
    const transcript = 'This is a test transcript.';
    const reviewId = 'test-review-id';
    const result = await analyzeReviewText(transcript, reviewId);
    expect(result).toEqual({
      alsoRecommends: [],
      biasIndicators: ['story-driven bias'],
      cons: ['Too short'],
      legacyAndInfluence: null,
      pros: ['Great story'],
      reviewSummary: 'A solid review.',
      sentimentScore: 7,
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      verdict: 'mixed',
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
    expect(fromMock).toHaveBeenCalledWith('reviews');
    expect(updateMock).toHaveBeenCalledWith({
      sentimentSummary: JSON.stringify(result),
    });
    expect(eqMock).toHaveBeenCalledWith('id', reviewId);
  });

  it('returns fallback if OpenAI response is malformed', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    await expect(analyzeReviewText('Bad transcript', 'bad-id')).resolves.toEqual({
      alsoRecommends: [],
      biasIndicators: [],
      cons: [],
      pros: [],
      reviewSummary: 'No review summary available.',
      sentimentScore: 5,
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      verdict: 'mixed',
      legacyAndInfluence: null,
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
  });

  it('returns fallback if OpenAI errors', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    await expect(analyzeReviewText('fail', 'fail-id')).resolves.toEqual({
      alsoRecommends: [],
      biasIndicators: [],
      cons: [],
      pros: [],
      reviewSummary: 'No review summary available.',
      sentimentScore: 5,
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      verdict: 'mixed',
      legacyAndInfluence: null,
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
  });
});
