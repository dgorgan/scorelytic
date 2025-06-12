import axios from 'axios';

export interface YouTubeVideoMetadata {
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  description: string;
  gameSlug?: string;
  gameTitle?: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  tags?: string[];
}

export const fetchYouTubeVideoMetadata = async (videoId: string): Promise<YouTubeVideoMetadata> => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        id: videoId,
        key: apiKey,
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(
        `No video found for ID: ${videoId}. Video may be private, deleted, or region-blocked.`,
      );
    }

    const video = response.data.items[0];
    const snippet = video.snippet;

    // Check for age-restricted or private content
    if (!snippet) {
      throw new Error(
        `Video ${videoId} is not accessible. It may be private, age-restricted, or deleted.`,
      );
    }

    return {
      title: snippet.title || 'Unknown Title',
      channelTitle: snippet.channelTitle || 'Unknown Channel',
      channelId: snippet.channelId || '',
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      description: snippet.description || '',
      thumbnails: snippet.thumbnails || {},
      tags: snippet.tags || [],
    };
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('YouTube API quota exceeded. Please try again later.');
    }
    if (error.response?.status === 400) {
      throw new Error(`Invalid video ID: ${videoId}`);
    }
    if (error.message.includes('No video found')) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`Failed to fetch YouTube metadata: ${error.message}`);
  }
};

/**
 * Extracts game title from video title and description using common patterns
 */
export const extractGameFromMetadata = (metadata: YouTubeVideoMetadata): string | null => {
  const { title, description, tags, channelTitle } = metadata;

  // Common patterns for game reviews
  const patterns = [
    /^(.+?)\s+review/i, // "Game Title Review"
    /(?:review|playing|let's play)\s+(.+?)(?:\s+[-|]|$)/i,
    /(.+?)\s+(?:gameplay|walkthrough)/i,
    /^(.+?)\s+[-|]/, // "Game Title - Something"
    // Add more patterns as needed
  ];

  // Try title first
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[1].toLowerCase() !== channelTitle.toLowerCase()) {
      return match[1].trim();
    }
  }

  // Try tags, but avoid channel name and generic tags
  if (tags) {
    const gameTag = tags.find(
      (tag) =>
        tag.toLowerCase() !== channelTitle.toLowerCase() &&
        !tag.toLowerCase().includes('stream') &&
        !tag.toLowerCase().includes('vod') &&
        (tag.toLowerCase().includes('game') ||
          tag.toLowerCase().includes('review') ||
          tag.length > 10),
    );
    if (gameTag) return gameTag;
  }

  // Fallback: try to extract from description (e.g. "Review of [Game Title]")
  const descMatch = description.match(/review of ([^\n\r]+)/i);
  if (descMatch && descMatch[1] && descMatch[1].toLowerCase() !== channelTitle.toLowerCase()) {
    return descMatch[1].trim();
  }

  return null;
};

/**
 * Creates a slug from a string (for database keys)
 */
export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .trim();
};
