import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditResultModal from '../EditResultModal';
import { Result } from '../utils';

describe('EditResultModal', () => {
  const mockResult: Result = {
    reviewId: 'review-1',
    field: 'pros',
    seed: 'Great graphics',
    llm: 'Excellent visuals',
    similarity: '0.85'
  };

  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    result: mockResult,
    onSave: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<EditResultModal {...mockProps} />);
    
    expect(screen.getByText('Edit Review Fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<EditResultModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Edit Review Fields')).not.toBeInTheDocument();
  });

  it('renders LLM Output and Similarity fields', () => {
    render(<EditResultModal {...mockProps} />);
    
    expect(screen.getByDisplayValue('Excellent visuals')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.85')).toBeInTheDocument();
  });

  it('displays current field values', () => {
    render(<EditResultModal {...mockProps} />);
    
    expect(screen.getByDisplayValue('Excellent visuals')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.85')).toBeInTheDocument();
  });

  it('handles LLM output changes', () => {
    render(<EditResultModal {...mockProps} />);
    
    const llmTextarea = screen.getByDisplayValue('Excellent visuals');
    fireEvent.change(llmTextarea, { target: { value: 'Amazing graphics' } });
    
    expect(screen.getByDisplayValue('Amazing graphics')).toBeInTheDocument();
  });

  it('handles similarity changes', () => {
    render(<EditResultModal {...mockProps} />);
    
    const similarityInput = screen.getByDisplayValue('0.85');
    fireEvent.change(similarityInput, { target: { value: '0.90' } });
    
    expect(screen.getByDisplayValue('0.90')).toBeInTheDocument();
  });

  it('calls onSave with updated result', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    render(<EditResultModal {...mockProps} onSave={mockOnSave} />);
    
    const llmTextarea = screen.getByDisplayValue('Excellent visuals');
    fireEvent.change(llmTextarea, { target: { value: 'Amazing graphics' } });
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        llm: 'Amazing graphics',
        similarity: '0.85'
      });
    });
  });

  it('validates similarity score range', async () => {
    render(<EditResultModal {...mockProps} />);
    
    const similarityInput = screen.getByDisplayValue('0.85');
    fireEvent.change(similarityInput, { target: { value: '1.5' } });
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Similarity must be a number between 0 and 1')).toBeInTheDocument();
    });
  });

  it('validates similarity score is a number', async () => {
    render(<EditResultModal {...mockProps} />);
    
    const similarityInput = screen.getByDisplayValue('0.85');
    fireEvent.change(similarityInput, { target: { value: 'not a number' } });
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Similarity must be a number between 0 and 1')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    render(<EditResultModal {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('disables save button when no changes', () => {
    render(<EditResultModal {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes are made', () => {
    render(<EditResultModal {...mockProps} />);
    
    const llmTextarea = screen.getByDisplayValue('Excellent visuals');
    fireEvent.change(llmTextarea, { target: { value: 'Amazing graphics' } });
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state while saving', async () => {
    const mockOnSave = jest.fn().mockImplementation(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
    render(<EditResultModal {...mockProps} onSave={mockOnSave} />);
    
    const llmTextarea = screen.getByDisplayValue('Excellent visuals');
    fireEvent.change(llmTextarea, { target: { value: 'Amazing graphics' } });
    
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
    render(<EditResultModal {...mockProps} onSave={mockOnSave} />);
    
    const llmTextarea = screen.getByDisplayValue('Excellent visuals');
    fireEvent.change(llmTextarea, { target: { value: 'Amazing graphics' } });
    
    const saveButton = screen.getByRole('button', { name: /Save/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });
}); 