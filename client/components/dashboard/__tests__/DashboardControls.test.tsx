import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardControls from '../DashboardControls';

describe('DashboardControls', () => {
  const mockProps = {
    showMismatches: false,
    setShowMismatches: jest.fn(),
    search: '',
    setSearch: jest.fn(),
    filter: 'all' as const,
    setFilter: jest.fn(),
    csvFile: 'llm_review_batch_results.csv',
    setCsvFile: jest.fn(),
    csvOptions: [
      {
        label: 'LLM Review Batch Results',
        value: 'llm_review_batch_results.csv',
      },
      { label: 'Bias Mismatches', value: 'bias_mismatches.csv' },
    ],
    groupedView: true,
    setGroupedView: jest.fn(),
    onDownloadCSV: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all control elements', () => {
    render(<DashboardControls {...mockProps} />);

    expect(screen.getByLabelText(/Show only mismatches/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search reviewId, field, text.../)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unreviewed/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overridden/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grouped View/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advanced QA/ })).toBeInTheDocument();
  });

  it('handles mismatch checkbox toggle', () => {
    render(<DashboardControls {...mockProps} />);

    const checkbox = screen.getByLabelText(/Show only mismatches/);
    fireEvent.click(checkbox);

    expect(mockProps.setShowMismatches).toHaveBeenCalledWith(true);
  });

  it('handles search input changes', () => {
    render(<DashboardControls {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/Search reviewId, field, text.../);
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockProps.setSearch).toHaveBeenCalledWith('test search');
  });

  it('handles filter button clicks', () => {
    render(<DashboardControls {...mockProps} />);

    const unreviewedButton = screen.getByRole('button', { name: /Unreviewed/ });
    fireEvent.click(unreviewedButton);

    expect(mockProps.setFilter).toHaveBeenCalledWith('unreviewed');

    const overriddenButton = screen.getByRole('button', { name: /Overridden/ });
    fireEvent.click(overriddenButton);

    expect(mockProps.setFilter).toHaveBeenCalledWith('overridden');
  });

  it('handles CSV file selection', () => {
    render(<DashboardControls {...mockProps} />);

    const select = screen.getByDisplayValue('LLM Review Batch Results');
    fireEvent.change(select, { target: { value: 'bias_mismatches.csv' } });

    expect(mockProps.setCsvFile).toHaveBeenCalledWith('bias_mismatches.csv');
  });

  it('handles view toggle buttons', () => {
    render(<DashboardControls {...mockProps} />);

    const advancedQAButton = screen.getByRole('button', {
      name: /Advanced QA/,
    });
    fireEvent.click(advancedQAButton);

    expect(mockProps.setGroupedView).toHaveBeenCalledWith(false);

    const groupedViewButton = screen.getByRole('button', {
      name: /Grouped View/,
    });
    fireEvent.click(groupedViewButton);

    expect(mockProps.setGroupedView).toHaveBeenCalledWith(true);
  });

  it('handles download CSV button click', () => {
    render(<DashboardControls {...mockProps} />);

    const downloadButton = screen.getByRole('button', { name: /Download CSV/ });
    fireEvent.click(downloadButton);

    expect(mockProps.onDownloadCSV).toHaveBeenCalled();
  });

  it('shows correct active states for filter buttons', () => {
    const propsWithUnreviewedFilter = {
      ...mockProps,
      filter: 'unreviewed' as const,
    };
    render(<DashboardControls {...propsWithUnreviewedFilter} />);

    const allButton = screen.getByRole('button', { name: /All/ });
    const unreviewedButton = screen.getByRole('button', { name: /Unreviewed/ });

    expect(allButton).toHaveClass('bg-neutral-200');
    expect(unreviewedButton).toHaveClass('bg-blue-700');
  });

  it('shows correct active states for view buttons', () => {
    const propsWithAdvancedView = { ...mockProps, groupedView: false };
    render(<DashboardControls {...propsWithAdvancedView} />);

    const groupedViewButton = screen.getByRole('button', {
      name: /Grouped View/,
    });
    const advancedQAButton = screen.getByRole('button', {
      name: /Advanced QA/,
    });

    expect(groupedViewButton).toHaveClass('bg-neutral-200');
    expect(advancedQAButton).toHaveClass('bg-blue-700');
  });

  it('displays current search value', () => {
    const propsWithSearch = { ...mockProps, search: 'existing search' };
    render(<DashboardControls {...propsWithSearch} />);

    const searchInput = screen.getByDisplayValue('existing search');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows mismatch checkbox as checked when enabled', () => {
    const propsWithMismatches = { ...mockProps, showMismatches: true };
    render(<DashboardControls {...propsWithMismatches} />);

    const checkbox = screen.getByLabelText(/Show only mismatches/) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
