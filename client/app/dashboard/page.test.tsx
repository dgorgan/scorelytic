import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './page';

// Mock next/dynamic to just return the component
jest.mock('next/dynamic', () => (importer: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
  const Comp = React.lazy(importer);
  const DynamicComponent: React.FC<Record<string, unknown>> = (props) => (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Comp {...props} />
    </React.Suspense>
  );
  DynamicComponent.displayName = 'MockDynamicComponent';
  return DynamicComponent;
});

// Mock Plotly
const MockPlotly: React.FC = () => <div data-testid="plotly-chart">Plotly Chart</div>;
MockPlotly.displayName = 'MockPlotly';
jest.mock('react-plotly.js', () => MockPlotly);

// Mock supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: () => ({ upsert: async () => ({ error: null }) })
  }
}));

// Mock fetch for CSV
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(
        'reviewId,field,seed,llm,similarity\n' +
        'r1,sentimentScore,,"LLM Sentiment",0.7\n' +
        'r1,verdict,,"LLM Verdict",0.9\n' +
        'r2,sentimentScore,,"LLM Sentiment",0.6\n' +
        'r2,verdict,,"LLM Verdict",0.95\n'
      )
    })
  ) as jest.Mock;
});

afterAll(() => {
  jest.resetAllMocks();
});

describe('Dashboard', () => {
  it('renders without crashing and shows legends/tooltips', async () => {
    render(<Dashboard />);
    expect(await screen.findByText(/How to use this dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Bar graph/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mismatch/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Overridden/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alt row/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Normal/).length).toBeGreaterThan(0);
    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument();
  });

  it('toggles between grouped and advanced QA views', async () => {
    render(<Dashboard />);
    await screen.findByText(/LLM Batch Test Results/);
    expect(screen.getByText(/Review ID/)).toBeInTheDocument();
    // Use role-based query for the button
    const advancedQaButton = screen.getAllByRole('button', { name: /Advanced QA/i })[0];
    fireEvent.click(advancedQaButton);
    expect(screen.getAllByText(/Field/).length).toBeGreaterThan(0);
  });

  it('displays N/A for missing fields', async () => {
    render(<Dashboard />);
    await screen.findByText(/LLM Batch Test Results/);
    // Should show N/A for missing seed
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });
}); 