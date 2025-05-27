import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './page';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    React.createElement('div', { 'data-testid': 'recharts-container' }, children),
  BarChart: ({ children }: { children: React.ReactNode }) => 
    React.createElement('div', { 'data-testid': 'recharts-bar-chart' }, children),
  Bar: () => React.createElement('div', { 'data-testid': 'recharts-bar' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'recharts-xaxis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'recharts-yaxis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'recharts-grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'recharts-tooltip' }),
}));

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
    
    // Check that the recharts components are rendered
    expect(await screen.findByTestId('recharts-container')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument();
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