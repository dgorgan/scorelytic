import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import BiasReportViewer from '../BiasReportViewer';
import type {
  ReviewSummary,
  BiasDetail,
  CulturalContext,
  FullBiasReport,
} from '@/shared/types/biasReport';

type BiasReport = {
  summary: ReviewSummary;
  details: BiasDetail[];
  culturalContext: CulturalContext;
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
      scoreImpact: -0.4,
      impactOnExperience:
        'Positive for players valuing identity expression; less immersive for others.',
      description:
        'Identity themes are foregrounded, which may enhance or detract from immersion depending on player alignment.',
    },
    {
      name: 'narrative framing bias',
      severity: 'high',
      scoreImpact: -0.3,
      impactOnExperience: 'Story heavily tied to contemporary sociopolitical themes.',
      description:
        'Narrative framing aligns with current ideological trends, which may polarize audiences.',
    },
  ],
  culturalContext: {
    originalScore: 8.5,
    biasAdjustedScore: 7.1,
    justification:
      'Score adjusted to reflect detected ideological, narrative, or identity-related influences.',
    audienceReaction: {
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
    expect(screen.getByText(/Cultural Context/)).toBeInTheDocument();
    expect(screen.getByText(/Full Report/)).toBeInTheDocument();
    // Toggle context section
    fireEvent.click(screen.getByText('Cultural Context'));
    expect(screen.getByText(/Original Score/)).toBeInTheDocument();
    // Toggle full report
    fireEvent.click(screen.getByText('Full Report'));
    expect(screen.getByText(/score_analysis_engine/)).toBeInTheDocument();
  });
});
