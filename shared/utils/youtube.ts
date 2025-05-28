// YouTube URL patterns and utilities

export const YOUTUBE_PATTERNS = {
  VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
  YOUTUBE_URL: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  YOUTUBE_SHORTS: /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
} as const;

export const YOUTUBE_CONSTANTS = {
  VIDEO_ID_LENGTH: 11,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000
} as const;

/**
 * Extracts YouTube video ID from various URL formats or validates direct ID
 */
export const extractVideoId = (input: string): string | null => {
  if (!input?.trim()) return null;
  
  const trimmed = input.trim();
  
  // Check if it's already a valid video ID
  if (YOUTUBE_PATTERNS.VIDEO_ID.test(trimmed)) {
    return trimmed;
  }
  
  // Try to extract from YouTube URL
  const urlMatch = trimmed.match(YOUTUBE_PATTERNS.YOUTUBE_URL);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }
  
  // Try to extract from YouTube Shorts
  const shortsMatch = trimmed.match(YOUTUBE_PATTERNS.YOUTUBE_SHORTS);
  if (shortsMatch?.[1]) {
    return shortsMatch[1];
  }
  
  return null;
};

/**
 * Validates if a string is a valid YouTube video ID
 */
export const isValidVideoId = (videoId: string): boolean => {
  return YOUTUBE_PATTERNS.VIDEO_ID.test(videoId);
};

/**
 * Creates a YouTube watch URL from video ID
 */
export const createYouTubeUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Creates a YouTube thumbnail URL
 */
export const createThumbnailUrl = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string => {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault', 
    high: 'hqdefault',
    maxres: 'maxresdefault'
  };
  
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}; 