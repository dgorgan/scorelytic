import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RowColorLegend from '../RowColorLegend';

// Mock Radix UI Tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <div>{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  Arrow: () => <div data-testid="tooltip-arrow" />
}));

describe('RowColorLegend', () => {
  it('renders all legend items', () => {
    render(<RowColorLegend />);
    
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
    expect(screen.getByText('Overridden')).toBeInTheDocument();
    expect(screen.getByText('Alt row')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('displays correct color indicators', () => {
    const { container } = render(<RowColorLegend />);
    
    const colorIndicators = container.querySelectorAll('span[class*="inline-block w-4 h-4"]');
    
    expect(colorIndicators).toHaveLength(4);
    expect(colorIndicators[0]).toHaveClass('bg-red-400', 'border-red-700');
    expect(colorIndicators[1]).toHaveClass('bg-green-400', 'border-green-700');
    expect(colorIndicators[2]).toHaveClass('bg-yellow-300', 'border-yellow-700');
    expect(colorIndicators[3]).toHaveClass('bg-white', 'border-gray-500');
  });

  it('renders help tooltips for each legend item', () => {
    render(<RowColorLegend />);
    
    const helpIcons = screen.getAllByText('?');
    expect(helpIcons).toHaveLength(4);
    
    const tooltipContents = screen.getAllByTestId('tooltip-content');
    expect(tooltipContents).toHaveLength(4);
  });

  it('displays correct tooltip content', () => {
    render(<RowColorLegend />);
    
    expect(screen.getByText(/At least one field in this row has a similarity/)).toBeInTheDocument();
    expect(screen.getByText(/This row has been manually edited\/overridden/)).toBeInTheDocument();
    expect(screen.getByText(/Alternating row color for readability/)).toBeInTheDocument();
    expect(screen.getByText(/No mismatches, no overrides/)).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    const { container } = render(<RowColorLegend />);
    
    const legendContainer = container.firstChild;
    expect(legendContainer).toHaveClass(
      'flex',
      'flex-wrap',
      'gap-4',
      'items-center',
      'mb-4',
      'mt-2',
      'text-xs',
      'font-semibold',
      'bg-neutral-100',
      'border',
      'border-neutral-300',
      'rounded',
      'px-3',
      'py-2',
      'shadow-sm'
    );
  });
}); 