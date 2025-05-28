import { evaluateBiasImpact, generateBiasReport } from '../biasAdjustment';

describe('evaluateBiasImpact', () => {
  it('returns no adjustment for no bias', () => {
    const result = evaluateBiasImpact(8, []);
    expect(result.biasAdjustedScore).toBe(8);
    expect(result.totalScoreAdjustment).toBe(0);
    expect(result.biasImpact).toHaveLength(0);
  });

  it('applies positive adjustment for nostalgia bias', () => {
    const result = evaluateBiasImpact(7, ['nostalgia bias']);
    expect(result.biasAdjustedScore).toBe(7.4);
    expect(result.totalScoreAdjustment).toBe(0.4);
    expect(result.biasImpact[0].name).toBe('nostalgia bias');
  });

  it('applies negative adjustment for contrarian', () => {
    const result = evaluateBiasImpact(6, ['contrarian']);
    expect(result.biasAdjustedScore).toBe(5.5);
    expect(result.totalScoreAdjustment).toBe(-0.5);
    expect(result.biasImpact[0].name).toBe('contrarian');
  });

  it('clamps score to 0-10', () => {
    expect(evaluateBiasImpact(9.9, ['influencer bias']).biasAdjustedScore).toBe(10);
    expect(evaluateBiasImpact(0.2, ['contrarian']).biasAdjustedScore).toBe(0);
  });

  it('handles multiple biases', () => {
    const result = evaluateBiasImpact(8, ['nostalgia bias', 'franchise bias']);
    expect(result.biasAdjustedScore).toBe(8.6);
    expect(result.totalScoreAdjustment).toBe(0.6);
    expect(result.biasImpact).toHaveLength(2);
  });

  it('handles unknown bias gracefully', () => {
    const result = evaluateBiasImpact(5, ['unknown bias']);
    expect(result.biasAdjustedScore).toBe(5);
    expect(result.biasImpact[0].name).toBe('unknown bias');
    expect(result.biasImpact[0].scoreInfluence).toBe(0);
  });
});

describe('generateBiasReport', () => {
  it('produces all output layers for classic and ideological biases', () => {
    const { summary, details, culturalContext, fullReport } = generateBiasReport(8.5, [
      'nostalgia bias',
      'identity signaling bias',
      'narrative framing bias',
      'representation bias'
    ]);
    expect(summary.adjustedScore).toBeLessThan(8.5);
    expect(summary.verdict).toMatch(/positive|mixed|negative/);
    expect(summary.confidence).toBe('moderate');
    expect(summary.recommendationStrength).toMatch(/strong|moderate|weak/);
    expect(summary.biasSummary).toMatch(/nostalgia, identity signaling, narrative framing, representation/);
    expect(details.length).toBe(4);
    expect(details.some(d => d.name === 'identity signaling bias')).toBe(true);
    expect(details.some(d => d.name === 'narrative framing bias')).toBe(true);
    expect(culturalContext.biasAdjustedScore).toBe(summary.adjustedScore);
    expect(culturalContext.biasDetails.length).toBe(4);
    expect(fullReport.score_analysis_engine.bias_adjusted_score).toBe(summary.adjustedScore);
    expect(fullReport.score_analysis_engine.ideological_biases_detected.length).toBe(4);
  });

  it('handles no bias', () => {
    const { summary, details, culturalContext, fullReport } = generateBiasReport(7, []);
    expect(summary.adjustedScore).toBe(7);
    expect(details.length).toBe(0);
    expect(culturalContext.justification).toMatch(/no significant/i);
    expect(fullReport.score_analysis_engine.bias_adjusted_score).toBe(7);
  });
}); 