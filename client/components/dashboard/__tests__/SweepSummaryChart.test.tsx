import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SweepSummaryChart from '@/components/dashboard/SweepSummaryChart';
import { SweepSummaryRow } from '@/components/dashboard/utils';

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

describe('SweepSummaryChart', () => {
  const mockSweepSummary = [
    {
      model: 'gpt-3.5-turbo',
      prompt: 'default',
      field: 'sentimentScore',
      total_mismatches: '15',
      total_comparisons: '100',
    },
    {
      model: 'gpt-4',
      prompt: 'enhanced',
      field: 'verdict',
      total_mismatches: '8',
      total_comparisons: '100',
    },
  ];

  it('renders chart with correct data transformation', () => {
    render(<SweepSummaryChart sweepSummary={mockSweepSummary} />);

    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument();

    // Check that data is properly transformed
    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData).toHaveLength(2);
    expect(chartData[0]).toEqual({
      name: 'gpt-3.5-turbo | default | sentimentScore',
      mismatches: 15,
      model: 'gpt-3.5-turbo',
      prompt: 'default',
      field: 'sentimentScore',
      comparisons: 100,
    });
  });

  it('renders chart components with correct props', () => {
    render(<SweepSummaryChart sweepSummary={mockSweepSummary} />);

    expect(screen.getByTestId('recharts-bar')).toHaveAttribute('data-key', 'mismatches');
    expect(screen.getByTestId('recharts-bar')).toHaveAttribute('data-fill', '#8884d8');
    expect(screen.getByTestId('recharts-xaxis')).toHaveAttribute('data-key', 'name');
    expect(screen.getByTestId('recharts-grid')).toHaveAttribute('data-stroke', '3 3');
  });

  it('handles empty sweep summary', () => {
    render(<SweepSummaryChart sweepSummary={[]} />);

    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();

    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData).toHaveLength(0);
  });

  it('correctly parses string numbers to integers', () => {
    const sweepWithStringNumbers = [
      {
        model: 'test-model',
        prompt: 'test-prompt',
        field: 'test-field',
        total_mismatches: '25',
        total_comparisons: '200',
      },
    ];

    render(<SweepSummaryChart sweepSummary={sweepWithStringNumbers} />);

    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData[0].mismatches).toBe(25);
    expect(chartData[0].comparisons).toBe(200);
    expect(typeof chartData[0].mismatches).toBe('number');
    expect(typeof chartData[0].comparisons).toBe('number');
  });

  it('creates proper configuration names', () => {
    const complexSweep = [
      {
        model: 'gpt-4-turbo',
        prompt: 'enhanced-v2',
        field: 'reviewSummary',
        total_mismatches: '5',
        total_comparisons: '50',
      },
    ];

    render(<SweepSummaryChart sweepSummary={complexSweep} />);

    const chartElement = screen.getByTestId('recharts-bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

    expect(chartData[0].name).toBe('gpt-4-turbo | enhanced-v2 | reviewSummary');
  });
});
