import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YouTubeProcessor from '@/components/dashboard/YouTubeProcessor';
import { Result } from '@/components/dashboard/utils';

global.fetch = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

describe('YouTubeProcessor', () => {
  it('renders input and buttons', () => {
    render(<YouTubeProcessor />);
    expect(screen.getByPlaceholderText(/dQw4w9WgXcQ/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full Process/i })).toBeInTheDocument();
  });

  it('shows error for invalid input', async () => {
    render(<YouTubeProcessor />);
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), {
      target: { value: 'invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Full Process/i }));
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid YouTube video ID or URL/i)).toBeInTheDocument();
    });
  });

  it('calls fetch and displays result for process', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transcript: 'test transcript' }),
    });
    const onProcessComplete = jest.fn();
    render(<YouTubeProcessor onProcessComplete={onProcessComplete} />);
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Full Process/i }));
    await waitFor(() => {
      expect(screen.getByText(/Result:/i)).toBeInTheDocument();
      expect(screen.getByText(/test transcript/i)).toBeInTheDocument();
      expect(onProcessComplete).toHaveBeenCalledWith({
        transcript: 'test transcript',
      });
    });
  });

  it('calls fetch and displays result for metadata', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'Test Title' }),
    });
    render(<YouTubeProcessor />);
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Get Metadata/i }));
    await waitFor(() => {
      expect(screen.getByText(/Result:/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API fail' }),
    });
    render(<YouTubeProcessor />);
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Full Process/i }));
    await waitFor(() => {
      expect(screen.getByText(/API fail/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    let resolveFetch: any;
    (fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFetch = res;
        }),
    );
    render(<YouTubeProcessor />);
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Full Process/i }));
    expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();
    resolveFetch({ ok: true, json: async () => ({ transcript: 'done' }) });
    await waitFor(() => {
      expect(screen.getByText(/done/i)).toBeInTheDocument();
    });
  });
});
