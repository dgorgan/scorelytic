import type {
  ReviewSummary,
  BiasDetail,
  CulturalContext,
  FullBiasReport,
} from '@/types/biasReport';

describe('BiasReport types', () => {
  it('accepts valid ReviewSummary', () => {
    const summary: ReviewSummary = {
      adjustedScore: 7.1,
      verdict: 'generally positive',
      confidence: 'high',
      recommendationStrength: 'moderate',
      biasSummary: 'Includes moderate identity signaling bias.',
    };
    expect(summary.adjustedScore).toBe(7.1);
  });

  it('accepts valid BiasDetail', () => {
    const detail: BiasDetail = {
      name: 'identity signaling bias',
      severity: 'moderate',
      scoreImpact: -0.4,
      impactOnExperience: 'Positive for some, less immersive for others.',
      description: 'Identity themes foregrounded.',
    };
    expect(detail.name).toMatch(/identity/);
  });

  it('accepts valid CulturalContext', () => {
    const context: CulturalContext = {
      originalScore: 8.5,
      biasAdjustedScore: 7.1,
      justification: 'Score adjusted for ideological influences.',
      audienceReaction: {
        aligned: 'positive',
        neutral: 'mixed',
        opposed: 'negative',
      },
      biasDetails: [],
    };
    expect(context.biasAdjustedScore).toBeLessThan(context.originalScore);
  });

  it('accepts valid FullBiasReport', () => {
    const report: FullBiasReport = {
      score_analysis_engine: {
        input_review_score: 8.5,
        ideological_biases_detected: [],
        bias_adjusted_score: 7.1,
        score_context_note: 'Contextual calibration.',
      },
    };
    expect(report.score_analysis_engine.bias_adjusted_score).toBe(7.1);
  });
});
