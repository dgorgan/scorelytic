import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './page';

// Mock next/dynamic to return our mocked Plotly component
jest.mock('next/dynamic', () => {
  return function mockDynamic() {
    // Return a mock component that renders the plotly chart
    const MockComponent = () => {
      return React.createElement('div', { 'data-testid': 'plotly-chart' }, 'Plotly Chart');
    };
    MockComponent.displayName = 'MockPlotly';
    return MockComponent;
  };
});

// Also mock react-plotly.js directly as a fallback
jest.mock('react-plotly.js', () => {
  const MockPlotly = () => {
    return React.createElement('div', { 'data-testid': 'plotly-chart' }, 'Plotly Chart');
  };
  MockPlotly.displayName = 'MockPlotly';
  return MockPlotly;
});

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
  it('renders without crashing and shows basic content', async () => {
    render(React.createElement(Dashboard));
    
    // Wait for component to load and check for basic elements
    expect(await screen.findByText(/How to use this dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Bar graph/i)).toBeInTheDocument();
  });

  it('displays chart component', async () => {
    render(React.createElement(Dashboard));
    
    // Check that the plotly chart is rendered
    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument();
  });

  it('shows LLM batch test results section', async () => {
    render(React.createElement(Dashboard));
    
    // Check for the results section
    expect(await screen.findByText(/LLM Batch Test Results/i)).toBeInTheDocument();
  });

  it('displays legend items', async () => {
    render(React.createElement(Dashboard));
    
    // Check for legend items
    await screen.findByText(/How to use this dashboard/i);
    expect(screen.getAllByText(/Mismatch/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Overridden/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alt row/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Normal/).length).toBeGreaterThan(0);
  });

  it('can toggle between grouped and advanced QA views', async () => {
    render(React.createElement(Dashboard));
    
    // Wait for component to load
    await screen.findByText(/LLM Batch Test Results/i);
    
    // Find the Advanced QA button and click it
    const advancedQaButton = screen.getByRole('button', { name: /Advanced QA/i });
    fireEvent.click(advancedQaButton);
    
    // Check that we can see field-specific content
    expect(screen.getAllByText(/Field/).length).toBeGreaterThan(0);
  });
}); 