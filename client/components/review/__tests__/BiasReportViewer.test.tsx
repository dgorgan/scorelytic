import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import BiasReportViewer from '../BiasReportViewer';
import type {
  ReviewSummary,
  BiasDetail,
  legacyAndInfluence,
  FullBiasReport,
} from '@scorelytic/shared';

type BiasReport = {
  summary: ReviewSummary;
  details: BiasDetail[];
  legacyAndInfluence: legacyAndInfluence;
  fullReport: FullBiasReport;
};

const sampleReport: BiasReport = {
  summary: {
    adjustedScore: 7.1,
    verdict: 'generally positive',
    confidence: 'high' as const,
    recommendationStrength: 'moderate' as const,
    biasSummary: 'Includes moderate identity signaling, narrative framing, and nostalgia biases.',
  },
  details: [
    {
      name: 'identity signaling bias',
      severity: 'moderate',
      adjustedInfluence: -0.4,
      baseScoreInfluence: -0.4,
      maxScoreInfluence: -0.4,
      impactOnExperience:
        'Positive for players valuing identity expression; less immersive for others.',
      explanation:
        'Identity themes are foregrounded, which may enhance or detract from immersion depending on player alignment.',
      confidenceScore: 0.8,
      detectedIn: ['tone'],
      reviewerIntent: 'implied' as const,
      evidence: ['identity themes'],
    },
    {
      name: 'narrative framing bias',
      severity: 'high',
      adjustedInfluence: -0.3,
      baseScoreInfluence: -0.3,
      maxScoreInfluence: -0.3,
      impactOnExperience: 'Story heavily tied to contemporary sociopolitical themes.',
      explanation:
        'Narrative framing aligns with current ideological trends, which may polarize audiences.',
      confidenceScore: 0.9,
      detectedIn: ['phrasing'],
      reviewerIntent: 'explicit' as const,
      evidence: ['sociopolitical themes'],
    },
  ],
  legacyAndInfluence: {
    originalScore: 8.5,
    biasAdjustedScore: 7.1,
    justification:
      'Score adjusted to reflect detected ideological, narrative, or identity-related influences.',
    playerFit: {
      aligned: 'positive',
      neutral: 'mixed',
      opposed: 'negative',
    },
    biasDetails: [],
  },
  fullReport: {
    score_analysis_engine: {
      input_review_score: 8.5,
      ideological_biases_detected: [],
      bias_adjusted_score: 7.1,
      score_context_note: 'This adjustment is a contextual calibration, not a value judgment.',
    },
  },
};

describe('BiasReportViewer', () => {
  it('renders all output layers and toggles sections', () => {
    render(<BiasReportViewer report={sampleReport} />);
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
    // Toggle details section
    fireEvent.click(screen.getByText('Bias Details'));
    expect(screen.getByText(/identity signaling bias/)).toBeInTheDocument();
    expect(screen.getByText(/Legacy & Influence/)).toBeInTheDocument();
    expect(screen.getByText(/Full Report/)).toBeInTheDocument();
    // Toggle context section
    fireEvent.click(screen.getByText('Legacy & Influence'));
    expect(screen.getByText(/Original Score/)).toBeInTheDocument();
    // Toggle full report
    fireEvent.click(screen.getByText('Full Report'));
    expect(screen.getByText(/score_analysis_engine/)).toBeInTheDocument();
  });
});
