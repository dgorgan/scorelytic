import axios from 'axios';

export interface YouTubeVideoMetadata {
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  description: string;
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
    throw new Error('YOUTUBE_API_KEY environment variable is required');
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet',
        id: videoId,
        key: apiKey
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`No video found for ID: ${videoId}`);
    }

    const video = response.data.items[0];
    const snippet = video.snippet;

    return {
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      publishedAt: snippet.publishedAt,
      description: snippet.description,
      thumbnails: snippet.thumbnails,
      tags: snippet.tags || []
    };
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('YouTube API quota exceeded or invalid API key');
    }
    throw new Error(`Failed to fetch YouTube metadata: ${error.message}`);
  }
};

/**
 * Extracts game title from video title and description using common patterns
 */
export const extractGameFromMetadata = (metadata: YouTubeVideoMetadata): string | null => {
  const { title, description, tags } = metadata;
  
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
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Try tags
  if (tags) {
    // Look for game-related tags
    const gameTag = tags.find(tag => 
      tag.toLowerCase().includes('game') || 
      tag.toLowerCase().includes('review') ||
      tag.length > 10 // Longer tags are often game titles
    );
    if (gameTag) return gameTag;
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