import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupedTable from '@/components/dashboard/GroupedTable';
import { GroupedResult, Result } from '@/components/dashboard/utils';

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

describe('GroupedTable', () => {
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
      field: 'pros',
      seed: 'Good story',
      llm: 'Compelling narrative',
      similarity: '0.90',
    },
  ];

  const mockGroupedResults: (GroupedResult & { hasMismatch: boolean })[] = [
    {
      reviewId: 'review-1',
      seed: 'Great graphics',
      fields: {
        pros: 'Excellent visuals',
        cons: 'Brief gameplay',
      },
      idxs: {
        pros: 0,
        cons: 1,
      },
      hasMismatch: true,
    },
    {
      reviewId: 'review-2',
      seed: 'Good story',
      fields: {
        pros: 'Compelling narrative',
      },
      idxs: {
        pros: 2,
      },
      hasMismatch: false,
    },
  ];

  const mockProps = {
    filteredGroupedResults: mockGroupedResults,
    reviewFields: ['pros', 'cons'],
    results: mockResults,
    onEditReview: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with correct headers', () => {
    render(<GroupedTable {...mockProps} />);

    expect(screen.getByText('Review ID')).toBeInTheDocument();
    expect(screen.getByText('pros')).toBeInTheDocument();
    expect(screen.getByText('cons')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders grouped results correctly', () => {
    render(<GroupedTable {...mockProps} />);

    expect(screen.getByText('review-1')).toBeInTheDocument();
    expect(screen.getByText('review-2')).toBeInTheDocument();
    // Use getAllByText for elements that appear multiple times (in tooltips too)
    expect(screen.getAllByText('Excellent visuals')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Brief gameplay')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Compelling narrative')[0]).toBeInTheDocument();
  });

  it('applies correct row styling for mismatches', () => {
    render(<GroupedTable {...mockProps} />);

    const rows = screen.getAllByRole('row');
    // First row is header, second is review-1 (has mismatch), third is review-2 (no mismatch, index 1 = odd)
    expect(rows[1]).toHaveClass('bg-red-50');
    expect(rows[2]).toHaveClass('bg-yellow-50'); // index 1 is odd, so yellow-50
  });

  it('displays seed and LLM data in separate sections', () => {
    render(<GroupedTable {...mockProps} />);

    expect(screen.getAllByText('Seed')).toHaveLength(4); // 2 reviews × 2 fields each
    expect(screen.getAllByText('LLM')).toHaveLength(4);
    expect(screen.getAllByText('Great graphics')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Too short')[0]).toBeInTheDocument();
  });

  it('handles edit button clicks', () => {
    render(<GroupedTable {...mockProps} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockProps.onEditReview).toHaveBeenCalledWith(0);

    fireEvent.click(editButtons[1]);
    expect(mockProps.onEditReview).toHaveBeenCalledWith(1);
  });

  it('handles empty results gracefully', () => {
    const emptyProps = {
      ...mockProps,
      filteredGroupedResults: [],
      results: [],
    };

    render(<GroupedTable {...emptyProps} />);

    expect(screen.getByText('Review ID')).toBeInTheDocument();
    expect(screen.getByText('pros')).toBeInTheDocument();
    expect(screen.getByText('cons')).toBeInTheDocument();

    // Should only have header row
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1);
  });

  it('handles missing field data gracefully', () => {
    const incompleteGroupedResults = [
      {
        reviewId: 'review-incomplete',
        seed: 'Some seed',
        fields: {
          pros: 'Only pros field',
          // cons field missing
        },
        idxs: {
          pros: 0,
          // cons index missing
        },
        hasMismatch: false,
      },
    ];

    const incompleteProps = {
      ...mockProps,
      filteredGroupedResults: incompleteGroupedResults,
    };

    render(<GroupedTable {...incompleteProps} />);

    expect(screen.getByText('review-incomplete')).toBeInTheDocument();
    expect(screen.getAllByText('Only pros field')[0]).toBeInTheDocument();
  });

  it('applies alternating row colors correctly', () => {
    const manyResults = Array.from({ length: 5 }, (_, i) => ({
      reviewId: `review-${i}`,
      seed: `seed-${i}`,
      fields: { pros: `pros-${i}` },
      idxs: { pros: i },
      hasMismatch: false,
    }));

    const manyProps = {
      ...mockProps,
      filteredGroupedResults: manyResults,
    };

    render(<GroupedTable {...manyProps} />);

    const rows = screen.getAllByRole('row');
    // Skip header row (index 0)
    expect(rows[1]).toHaveClass('bg-white'); // Even index (0)
    expect(rows[2]).toHaveClass('bg-yellow-50'); // Odd index (1)
    expect(rows[3]).toHaveClass('bg-white'); // Even index (2)
    expect(rows[4]).toHaveClass('bg-yellow-50'); // Odd index (3)
  });

  it('renders tooltips for seed and LLM data', () => {
    render(<GroupedTable {...mockProps} />);

    // Should have tooltip content elements - each field has 2 tooltips (seed + LLM)
    // review-1 has 2 fields (pros, cons) = 4 tooltips
    // review-2 has 1 field (pros) but cons shows N/A = 4 tooltips total
    expect(screen.getAllByTestId('tooltip-content')).toHaveLength(8);
  });
});
