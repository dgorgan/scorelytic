jest.mock('openai');

import { analyzeText } from '../sentimentService';
import { mapBiasLabelsToObjects, evaluateBiasImpact } from '../biasAdjustment';
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
      summary: 'Test summary',
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      biasIndicators: ['contrarian'],
      alsoRecommends: ['Game Y'],
      pros: ['Interesting mechanics'],
      cons: ['Bugs'],
      reviewSummary: 'A nuanced review.',
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(fullMockResult) } }],
    });
    const result = await analyzeText('This is a test.');
    expect(result).toEqual(fullMockResult);
  });

  it('returns fallback result on malformed LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });
    const result = await analyzeText('bad');
    expect(result).toEqual({
      summary: 'No clear summary detected.',
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
    });
  });

  it('returns fallback result on OpenAI error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    const result = await analyzeText('fail');
    expect(result).toEqual({
      summary: 'No clear summary detected.',
      sentimentScore: 5,
      verdict: 'mixed',
      sentimentSummary: 'Mixed',
      biasIndicators: [],
      alsoRecommends: [],
      pros: [],
      cons: [],
      reviewSummary: 'No review summary available.',
    });
  });
});

describe('Bias Adjustment', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('maps nostalgia bias correctly', () => {
    const result = mapBiasLabelsToObjects(['nostalgia bias']);
    expect(result[0].name).toBe('nostalgia bias');
    expect(result[0].severity).toBe('moderate');
    expect(result[0].scoreInfluence).toBe(0.5);
  });

  it('maps influencer bias correctly', () => {
    const result = mapBiasLabelsToObjects(['influencer bias']);
    expect(result[0].severity).toBe('high');
    expect(result[0].scoreInfluence).toBe(0.6);
  });

  it('returns fallback on JSON parse error', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });
    const result = await evaluateBiasImpact(7, ['nostalgia bias', 'contrarian'], '', [], []);
    expect(result.biasAdjustedScore).toBeLessThanOrEqual(10);
    expect(result.biasImpact.length).toBe(2);
    expect(result.adjustmentRationale).toMatch(/remove emotional or habitual bias/);
  });

  it('returns fallback on API error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    const result = await evaluateBiasImpact(8, ['franchise bias'], '', [], []);
    expect(result.biasAdjustedScore).toBeLessThanOrEqual(10);
    expect(result.biasImpact[0].name).toBe('franchise bias');
    expect(result.adjustmentRationale).toMatch(/remove emotional or habitual bias/);
  });

  it('tracks metrics for calls, fallbacks, and errors', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"originalScore":8,"biasAdjustedScore":7.5,"totalScoreAdjustment":-0.5,"biasImpact":[],"audienceFit":"test","adjustmentRationale":"test"}',
          },
        },
      ],
    });
    await evaluateBiasImpact(8, [], '', [], []);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });
    await evaluateBiasImpact(7, ['contrarian'], '', [], []);
    mockCreate.mockRejectedValue(new Error('API fail'));
    await evaluateBiasImpact(6, ['contrarian'], '', [], []);
  });
});
