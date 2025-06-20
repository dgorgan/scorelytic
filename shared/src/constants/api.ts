// API Configuration
export const API_CONFIG = {
  BASE_URL:
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'https://api.scorelytic.com'
      : 'http://localhost:5000',
  ENDPOINTS: {
    YOUTUBE: {
      METADATA: '/api/youtube/metadata',
      PROCESS: '/api/youtube/process',
      PROCESS_STREAM: '/api/youtube/process/stream',
      TRANSCRIPT: '/api/youtube/transcript',
    },
    GAMES: '/api/games',
    CREATORS: '/api/creators',
    REVIEWS: '/api/reviews',
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  YOUTUBE: {
    INVALID_ID: 'Please enter a valid YouTube video ID or URL',
    FETCH_FAILED: 'Failed to fetch video metadata',
    PROCESS_FAILED: 'Failed to process video',
    TRANSCRIPT_FAILED: 'Failed to get transcript',
  },
  NETWORK: {
    CONNECTION_ERROR: 'Network connection error. Please try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  YOUTUBE: {
    METADATA_FETCHED: 'Video metadata fetched successfully',
    PROCESSING_COMPLETE: 'Video processing complete',
    TRANSCRIPT_READY: 'Transcript generated successfully',
  },
} as const;

// API Helper Functions
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }
  return url;
};

export const buildYouTubeMetadataUrl = (videoId: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.YOUTUBE.METADATA}/${videoId}`;
};

export const buildYouTubeProcessUrl = (): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.YOUTUBE.PROCESS}`;
};

export const buildYouTubeProcessStreamUrl = (videoId: string): string => {
  let url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.YOUTUBE.PROCESS_STREAM}?videoId=${encodeURIComponent(videoId)}`;
  return url;
};

export const buildYouTubeGeneralAnalysisUrl = (
  videoId: string,
  language: string = 'en',
): string => {
  const url = `${API_CONFIG.BASE_URL}/api/youtube/general-analysis?videoId=${encodeURIComponent(videoId)}&language=${encodeURIComponent(language)}`;
  return url;
};
