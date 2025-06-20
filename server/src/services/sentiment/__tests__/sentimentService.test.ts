jest.mock('openai');

import { analyzeText } from '../sentimentService';
import { mapBiasLabelsToObjects } from '../biasAdjustment';
import OpenAI from 'openai';

const mockCreate = jest.fn();
(OpenAI as any).mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
}));

describe('analyzeText', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns sentiment result for valid text', async () => {
    const fullMockResult = {
      alsoRecommends: ['Game Y'],
      biasIndicators: ['contrarian bias'],
      cons: ['Bugs'],
      legacyAndInfluence: null,
      pros: ['Interesting mechanics'],
      reviewSummary: 'A nuanced review.',
      sentimentScore: 5,
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      verdict: 'mixed',
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fullMockResult) } }],
    });
    const result = await analyzeText('This is a test.');
    expect(result).toEqual({
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      biasIndicators: ['contrarian bias'],
      alsoRecommends: ['Game Y'],
      pros: ['Interesting mechanics'],
      cons: ['Bugs'],
      reviewSummary: 'A nuanced review.',
      legacyAndInfluence: null,
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
  });

  it('returns fallback result on malformed LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });
    const result = await analyzeText('bad');
    expect(result).toEqual({
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
      legacyAndInfluence: null,
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
  });

  it('returns fallback result on OpenAI error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    const result = await analyzeText('fail');
    expect(result).toEqual({
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      sentimentSummaryFriendlyVerdict: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
      legacyAndInfluence: null,
      noBiasExplanationFromLLM: undefined,
      satirical: false,
    });
  });

  // it('detects satirical biases for satirical reviews', async () => {
  //   // Mock a satirical review with sarcasm bias
  //   const satiricalMockResult = {
  //     alsoRecommends: [],
  //     biasIndicators: ['sarcasm', 'contrarian bias'],
  //     cons: ['Too easy'],
  //     legacyAndInfluence: null,
  //     pros: ['Hilariously broken'],
  //     reviewSummary: 'A satirical take on this game.',
  //     sentimentScore: 6,
  //     sentimentSummary: 'The reviewer uses heavy sarcasm throughout',
  //     sentimentSummaryFriendlyVerdict: 'Mixed with satirical elements',
  //     verdict: 'mixed',
  //     satirical: true,
  //   };

  //   mockCreate.mockResolvedValue({
  //     choices: [{ message: { content: JSON.stringify(satiricalMockResult) } }],
  //   });

  //   const result = await analyzeText('This game is totally amazing and flawless... NOT!');

  //   expect(result.sentiment.satirical).toBe(true);
  //   expect(result.biasDetection.satiricalBiases).toBeDefined();
  //   expect(result.biasDetection.satiricalBiases).toHaveLength(1);
  //   expect(result.biasDetection.satiricalBiases![0].name).toBe('sarcasm');
  //   expect(result.biasDetection.satiricalBiases![0].explanation).toContain('entertainment value');
  // });
});

describe('Bias Adjustment', () => {
  it('maps nostalgia bias correctly', () => {
    const result = mapBiasLabelsToObjects(['nostalgia bias']);
    expect(result[0].name).toBe('nostalgia bias');
    expect(result[0].severity).toBe('moderate');
    expect(result[0].scoreInfluence).toBeDefined();
    expect(result[0].confidenceScore).toBeDefined();
    expect(result[0].adjustedInfluence).toBeDefined();
  });

  it('maps influencer bias correctly', () => {
    const result = mapBiasLabelsToObjects(['influencer bias']);
    expect(result[0].name).toBe('influencer bias');
    expect(result[0].severity).toBeDefined();
    expect(result[0].scoreInfluence).toBeDefined();
    expect(result[0].confidenceScore).toBeDefined();
    expect(result[0].adjustedInfluence).toBeDefined();
  });
});
