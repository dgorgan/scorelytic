import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedTable from '../AdvancedTable';
import { Result } from '../utils';

// Mock Radix UI Tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  Arrow: () => <div data-testid="tooltip-arrow" />,
}));

describe('AdvancedTable', () => {
  const mockResults: Result[] = [
    {
      reviewId: 'review-1',
      field: 'pros',
      seed: 'Great graphics',
      llm: 'Excellent visuals',
      similarity: '0.85',
    },
    {
      reviewId: 'review-1',
      field: 'cons',
      seed: 'Too short',
      llm: 'Brief gameplay',
      similarity: '0.75',
    },
    {
      reviewId: 'review-2',
      field: 'sentimentScore',
      seed: '',
      llm: '8',
      similarity: '0.60',
    },
  ];

  const mockProps = {
    filteredResults: mockResults,
    onEditResult: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with correct headers', () => {
    render(<AdvancedTable {...mockProps} />);

    expect(screen.getByText('Review ID')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('Similarity')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders results correctly', () => {
    render(<AdvancedTable {...mockProps} />);

    expect(screen.getAllByText('review-1')[0]).toBeInTheDocument();
    expect(screen.getByText('review-2')).toBeInTheDocument();
    expect(screen.getByText('pros')).toBeInTheDocument();
    expect(screen.getByText('cons')).toBeInTheDocument();
    expect(screen.getByText('sentimentScore')).toBeInTheDocument();
    expect(screen.getAllByText('Great graphics')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Excellent visuals')[0]).toBeInTheDocument();
  });

  it('applies correct row styling for mismatches', () => {
    render(<AdvancedTable {...mockProps} />);

    const rows = screen.getAllByRole('row');
    // First row is header, second is 0.85 (no mismatch), third is 0.75 (mismatch), fourth is 0.60 (mismatch)
    expect(rows[1]).toHaveClass('bg-white'); // 0.85 >= 0.8
    expect(rows[2]).toHaveClass('bg-red-50'); // 0.75 < 0.8, mismatch styling takes precedence
    expect(rows[3]).toHaveClass('bg-red-50'); // 0.60 < 0.8, mismatch styling takes precedence
  });

  it('displays similarity scores with correct styling', () => {
    render(<AdvancedTable {...mockProps} />);

    const similarityValues = screen.getAllByText(/0\.\d{2}/);

    // 0.85 should be green (good)
    expect(similarityValues[0]).toHaveClass('text-green-600');
    expect(similarityValues[0]).toHaveTextContent('0.85');

    // 0.75 should be red (mismatch)
    expect(similarityValues[1]).toHaveClass('text-red-600', 'font-bold');
    expect(similarityValues[1]).toHaveTextContent('0.75');

    // 0.60 should be red (mismatch)
    expect(similarityValues[2]).toHaveClass('text-red-600', 'font-bold');
    expect(similarityValues[2]).toHaveTextContent('0.60');
  });

  it('handles edit button clicks', () => {
    render(<AdvancedTable {...mockProps} />);

    const editButtons = screen.getAllByText('Edit');

    fireEvent.click(editButtons[0]);
    expect(mockProps.onEditResult).toHaveBeenCalledWith(0);

    fireEvent.click(editButtons[1]);
    expect(mockProps.onEditResult).toHaveBeenCalledWith(1);

    fireEvent.click(editButtons[2]);
    expect(mockProps.onEditResult).toHaveBeenCalledWith(2);
  });

  it('handles empty results gracefully', () => {
    const emptyProps = {
      ...mockProps,
      filteredResults: [],
    };

    render(<AdvancedTable {...emptyProps} />);

    expect(screen.getByText('Review ID')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();

    // Should only have header row
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1);
  });

  it('applies alternating row colors correctly for non-mismatches', () => {
    const goodResults: Result[] = [
      {
        reviewId: 'review-1',
        field: 'field1',
        seed: 'seed1',
        llm: 'llm1',
        similarity: '0.90',
      },
      {
        reviewId: 'review-2',
        field: 'field2',
        seed: 'seed2',
        llm: 'llm2',
        similarity: '0.85',
      },
      {
        reviewId: 'review-3',
        field: 'field3',
        seed: 'seed3',
        llm: 'llm3',
        similarity: '0.95',
      },
    ];

    const goodProps = {
      ...mockProps,
      filteredResults: goodResults,
    };

    render(<AdvancedTable {...goodProps} />);

    const rows = screen.getAllByRole('row');
    // Skip header row (index 0)
    expect(rows[1]).toHaveClass('bg-white'); // Even index (0)
    expect(rows[2]).toHaveClass('bg-yellow-50'); // Odd index (1)
    expect(rows[3]).toHaveClass('bg-white'); // Even index (2)
  });

  it('renders tooltips for seed and LLM data', () => {
    render(<AdvancedTable {...mockProps} />);

    // Should have tooltip content elements for seed and LLM columns
    expect(screen.getAllByTestId('tooltip-content')).toHaveLength(6);
  });

  it('handles edge case similarity values', () => {
    const edgeCaseResults: Result[] = [
      {
        reviewId: 'review-edge',
        field: 'test',
        seed: 'test',
        llm: 'test',
        similarity: '0.80', // Exactly at threshold
      },
      {
        reviewId: 'review-edge2',
        field: 'test2',
        seed: 'test2',
        llm: 'test2',
        similarity: '1.00', // Perfect match
      },
    ];

    const edgeProps = {
      ...mockProps,
      filteredResults: edgeCaseResults,
    };

    render(<AdvancedTable {...edgeProps} />);

    const similarityValues = screen.getAllByText(/[01]\.\d{2}/);

    // 0.80 should be green (not a mismatch)
    expect(similarityValues[0]).toHaveClass('text-green-600');
    expect(similarityValues[0]).toHaveTextContent('0.80');

    // 1.00 should be green
    expect(similarityValues[1]).toHaveClass('text-green-600');
    expect(similarityValues[1]).toHaveTextContent('1.00');
  });

  it('generates unique keys for table rows', () => {
    render(<AdvancedTable {...mockProps} />);

    const rows = screen.getAllByRole('row');
    // Should render without React key warnings (no duplicate keys)
    expect(rows).toHaveLength(4); // 1 header + 3 data rows
  });
});
