import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import FieldMismatchChart from '../FieldMismatchChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: any[] }) => (
    <div data-testid="recharts-bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid="recharts-bar" data-key={dataKey} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="recharts-xaxis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="recharts-yaxis" />,
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="recharts-grid" data-stroke={strokeDasharray} />
  ),
  Tooltip: ({ formatter, labelFormatter }: any) => (
    <div data-testid="recharts-tooltip" data-formatter={formatter?.toString()} />
  ),
}));

describe('FieldMismatchChart', () => {
  const mockFieldCounts = {
    sentimentScore: 15,
    verdict: 12,
    pros: 8,
    cons: 5,
    reviewSummary: 3,
  };

  it('renders chart with correct data', () => {
    render(<FieldMismatchChart fieldCounts={mockFieldCounts} />);

    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument();

    // Check that data is properly formatted
    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData).toHaveLength(5);
    expect(chartData[0]).toEqual({ name: 'sentimentScore', mismatches: 15 });
    expect(chartData[1]).toEqual({ name: 'verdict', mismatches: 12 });
  });

  it('renders chart components with correct props', () => {
    render(<FieldMismatchChart fieldCounts={mockFieldCounts} />);

    expect(screen.getByTestId('recharts-bar')).toHaveAttribute('data-key', 'mismatches');
    expect(screen.getByTestId('recharts-bar')).toHaveAttribute('data-fill', '#dc2626');
    expect(screen.getByTestId('recharts-xaxis')).toHaveAttribute('data-key', 'name');
    expect(screen.getByTestId('recharts-grid')).toHaveAttribute('data-stroke', '3 3');
  });

  it('displays explanatory note', () => {
    render(<FieldMismatchChart fieldCounts={mockFieldCounts} />);

    expect(screen.getByText(/Each bar shows the number of mismatches/)).toBeInTheDocument();
    expect(screen.getByText(/Higher bars mean more disagreement/)).toBeInTheDocument();
  });

  it('handles empty field counts', () => {
    render(<FieldMismatchChart fieldCounts={{}} />);

    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();

    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData).toHaveLength(0);
  });

  it('sorts fields correctly', () => {
    const unsortedFields = {
      zField: 1,
      aField: 2,
      mField: 3,
    };

    render(<FieldMismatchChart fieldCounts={unsortedFields} />);

    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    // Object.entries preserves insertion order
    expect(chartData[0].name).toBe('zField'); // First inserted
    expect(chartData[1].name).toBe('aField'); // Second inserted
    expect(chartData[2].name).toBe('mField'); // Third inserted
  });
});
