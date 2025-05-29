import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditReviewModal from '@/components/dashboard/EditReviewModal';
import { Result } from '@/components/dashboard/utils';

describe('EditReviewModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    fields: {
      pros: 'Great graphics',
      cons: 'Too short',
      sentimentScore: '8',
    },
    reviewFields: ['pros', 'cons', 'sentimentScore'],
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<EditReviewModal {...mockProps} />);

    expect(screen.getByText('Edit Review Fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<EditReviewModal {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Edit Review Fields')).not.toBeInTheDocument();
  });

  it('renders all review fields', () => {
    render(<EditReviewModal {...mockProps} />);

    expect(screen.getByDisplayValue('Great graphics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Too short')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('displays current field values', () => {
    render(<EditReviewModal {...mockProps} />);

    expect(screen.getByDisplayValue('Great graphics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Too short')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('handles field value changes', () => {
    render(<EditReviewModal {...mockProps} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    expect(screen.getByDisplayValue('Amazing visuals')).toBeInTheDocument();
  });

  it('calls onSave with updated fields', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    render(<EditReviewModal {...mockProps} onSave={mockOnSave} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        pros: 'Amazing visuals',
        cons: 'Too short',
        sentimentScore: '8',
      });
    });
  });

  it('calls onClose when cancel is clicked', () => {
    render(<EditReviewModal {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('disables save button when no changes', () => {
    render(<EditReviewModal {...mockProps} />);

    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes are made', () => {
    render(<EditReviewModal {...mockProps} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state while saving', async () => {
    const mockOnSave = jest
      .fn()
      .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    render(<EditReviewModal {...mockProps} onSave={mockOnSave} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('displays error message on save failure', async () => {
    const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    render(<EditReviewModal {...mockProps} onSave={mockOnSave} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('resets fields on cancel', () => {
    render(<EditReviewModal {...mockProps} />);

    const prosTextarea = screen.getByDisplayValue('Great graphics');
    fireEvent.change(prosTextarea, { target: { value: 'Amazing visuals' } });

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
