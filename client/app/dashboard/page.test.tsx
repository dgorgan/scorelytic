import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './page';

// Mock Supabase client
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn(() => ({
    data: [
      {
        reviewId: 'review-1',
        field: 'pros',
        seed: 'Great graphics',
        llm: 'Excellent visuals',
        similarity: '0.85'
      },
      {
        reviewId: 'review-1',
        field: 'cons',
        seed: 'Too short',
        llm: 'Brief gameplay',
        similarity: '0.75'
      }
    ],
    errors: []
  })),
  unparse: jest.fn(() => 'mocked,csv,data')
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="recharts-bar" />,
  XAxis: () => <div data-testid="recharts-xaxis" />,
  YAxis: () => <div data-testid="recharts-yaxis" />,
  CartesianGrid: () => <div data-testid="recharts-grid" />,
  Tooltip: () => <div data-testid="recharts-tooltip" />
}));

// Mock Radix UI Tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <div>{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  Arrow: () => <div data-testid="tooltip-arrow" />
}));

describe('Dashboard', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('reviewId,field,seed,llm,similarity\nreview-1,pros,Great graphics,Excellent visuals,0.85')
    });

    // Mock Supabase calls
    const mockSupabase = require('@/services/supabase').supabase;
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with main components', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('LLM Review Analysis Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('How to use this dashboard')).toBeInTheDocument();
    expect(screen.getByText('Field Mismatches Overview')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();
  });

  it('displays row color legend', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Mismatch')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Overridden')[0]).toBeInTheDocument();
    expect(screen.getByText('Alt row')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('renders dashboard controls', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Show only mismatches/)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/Search reviewId, field, text.../)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grouped View/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advanced QA/ })).toBeInTheDocument();
  });

  it('toggles between grouped and advanced view', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Advanced QA/ })).toBeInTheDocument();
    });

    const advancedButton = screen.getByRole('button', { name: /Advanced QA/ });
    fireEvent.click(advancedButton);

    // Should show advanced table headers
    expect(screen.getByText('Review ID')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('Similarity')).toBeInTheDocument();
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('review-1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Review Fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
  });

  it('closes edit modal when cancel is clicked', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('review-1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Review Fields')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Edit Review Fields')).not.toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search reviewId, field, text.../)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search reviewId, field, text.../);
    fireEvent.change(searchInput, { target: { value: 'review-1' } });

    expect(searchInput).toHaveValue('review-1');
  });

  it('handles mismatch filter toggle', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Show only mismatches/)).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/Show only mismatches/);
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });
}); 