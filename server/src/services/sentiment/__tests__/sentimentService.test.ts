jest.mock('openai');

import { analyzeText, mapBiasLabelsToObjects, analyzeBiasImpact, setBiasAdjustmentEnabled, getBiasAdjustmentMetrics } from '../sentimentService';
import OpenAI from 'openai';

const mockCreate = jest.fn();
(OpenAI as any).mockImplementation(() => ({
  chat: { completions: { create: mockCreate } }
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

  it('returns fallback result on malformed LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: '{}' } }
      ]
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
      reviewSummary: 'No review summary available.'
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
      reviewSummary: 'No review summary available.'
    });
  });
});

describe('Bias Adjustment', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    setBiasAdjustmentEnabled(true);
  });

  it('maps nostalgia bias correctly', () => {
    const result = mapBiasLabelsToObjects(['nostalgia bias']);
    expect(result[0].biasName).toBe('nostalgia bias');
    expect(result[0].severity).toBe('moderate');
    expect(result[0].scoreInfluence).toBe(0.4);
  });

  it('maps influencer bias correctly', () => {
    const result = mapBiasLabelsToObjects(['influencer bias']);
    expect(result[0].severity).toBe('high');
    expect(result[0].scoreInfluence).toBe(1.0);
  });

  it('returns fallback on JSON parse error', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });
    const result = await analyzeBiasImpact({
      originalScore: 7,
      biasIndicators: ['nostalgia bias', 'contrarian'],
      reviewSummary: 'A review',
      pros: [],
      cons: []
    });
    expect(result.biasAdjustedScore).toBeLessThanOrEqual(10);
    expect(result.biasAnalysis.length).toBe(2);
    expect(result.adjustmentRationale).toMatch(/Fallback/);
  });

  it('returns fallback on API error', async () => {
    mockCreate.mockRejectedValue(new Error('API fail'));
    const result = await analyzeBiasImpact({
      originalScore: 8,
      biasIndicators: ['franchise bias'],
      reviewSummary: 'A review',
      pros: [],
      cons: []
    });
    expect(result.biasAdjustedScore).toBeLessThanOrEqual(10);
    expect(result.biasAnalysis[0].biasName).toBe('franchise bias');
    expect(result.adjustmentRationale).toMatch(/Fallback/);
  });

  it('tracks metrics for calls, fallbacks, and errors', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"originalScore":8,"biasAdjustedScore":7.5,"totalScoreAdjustment":-0.5,"biasAnalysis":[],"audienceFit":"test","adjustmentRationale":"test"}' } }] });
    await analyzeBiasImpact({
      originalScore: 8,
      biasIndicators: [],
      reviewSummary: '',
      pros: [],
      cons: []
    });
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });
    await analyzeBiasImpact({
      originalScore: 7,
      biasIndicators: ['contrarian'],
      reviewSummary: '',
      pros: [],
      cons: []
    });
    mockCreate.mockRejectedValue(new Error('API fail'));
    await analyzeBiasImpact({
      originalScore: 6,
      biasIndicators: ['contrarian'],
      reviewSummary: '',
      pros: [],
      cons: []
    });
    const metrics = getBiasAdjustmentMetrics();
    expect(metrics.biasAdjustmentCallCount).toBeGreaterThanOrEqual(3);
    expect(metrics.biasAdjustmentFallbackCount).toBeGreaterThanOrEqual(1);
    expect(metrics.biasAdjustmentApiErrorCount).toBeGreaterThanOrEqual(1);
  });
}); 