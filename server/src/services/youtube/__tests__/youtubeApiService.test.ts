import axios from 'axios';
import { fetchYouTubeVideoMetadata, extractGameFromMetadata, createSlug, YouTubeVideoMetadata } from '../youtubeApiService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouTubeApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.YOUTUBE_API_KEY;
  });

  describe('fetchYouTubeVideoMetadata', () => {
    it('should fetch video metadata successfully', async () => {
      const mockResponse = {
        data: {
          items: [{
            snippet: {
              title: 'Elden Ring Review - Amazing Game!',
              channelTitle: 'GameReviewer',
              channelId: 'UC123456789',
              publishedAt: '2022-02-25T00:00:00Z',
              description: 'My review of Elden Ring',
              thumbnails: {
                default: { url: 'https://example.com/default.jpg' },
                medium: { url: 'https://example.com/medium.jpg' },
                high: { url: 'https://example.com/high.jpg' }
              },
              tags: ['elden ring', 'review', 'gaming']
            }
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetchYouTubeVideoMetadata('test-video-id');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'snippet',
            id: 'test-video-id',
            key: 'test-api-key'
          }
        }
      );

      expect(result).toEqual({
        title: 'Elden Ring Review - Amazing Game!',
        channelTitle: 'GameReviewer',
        channelId: 'UC123456789',
        publishedAt: '2022-02-25T00:00:00Z',
        description: 'My review of Elden Ring',
        thumbnails: {
          default: { url: 'https://example.com/default.jpg' },
          medium: { url: 'https://example.com/medium.jpg' },
          high: { url: 'https://example.com/high.jpg' }
        },
        tags: ['elden ring', 'review', 'gaming']
      });
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.YOUTUBE_API_KEY;

      await expect(fetchYouTubeVideoMetadata('test-video-id'))
        .rejects.toThrow('YOUTUBE_API_KEY environment variable is required');
    });

    it('should throw error when video not found', async () => {
      mockedAxios.get.mockResolvedValue({ data: { items: [] } });

      await expect(fetchYouTubeVideoMetadata('invalid-video-id'))
        .rejects.toThrow('No video found for ID: invalid-video-id');
    });

    it('should handle API quota exceeded error', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 403 }
      });

      await expect(fetchYouTubeVideoMetadata('test-video-id'))
        .rejects.toThrow('YouTube API quota exceeded or invalid API key');
    });
  });

  describe('extractGameFromMetadata', () => {
    it('should extract game title from review pattern', () => {
      const metadata: YouTubeVideoMetadata = {
        title: 'Elden Ring Review - Best Game Ever!',
        channelTitle: 'GameReviewer',
        channelId: 'UC123',
        publishedAt: '2022-02-25T00:00:00Z',
        description: 'My review',
        thumbnails: {
          default: { url: '' },
          medium: { url: '' },
          high: { url: '' }
        },
        tags: []
      };

      const result = extractGameFromMetadata(metadata);
      expect(result).toBe('Elden Ring');
    });

    it('should extract game title from gameplay pattern', () => {
      const metadata: YouTubeVideoMetadata = {
        title: 'Cyberpunk 2077 Gameplay Walkthrough',
        channelTitle: 'Gamer',
        channelId: 'UC123',
        publishedAt: '2022-02-25T00:00:00Z',
        description: 'Gameplay video',
        thumbnails: {
          default: { url: '' },
          medium: { url: '' },
          high: { url: '' }
        },
        tags: []
      };

      const result = extractGameFromMetadata(metadata);
      expect(result).toBe('Cyberpunk 2077');
    });

    it('should extract from tags when title patterns fail', () => {
      const metadata: YouTubeVideoMetadata = {
        title: 'Amazing Video!',
        channelTitle: 'Gamer',
        channelId: 'UC123',
        publishedAt: '2022-02-25T00:00:00Z',
        description: 'Video description',
        thumbnails: {
          default: { url: '' },
          medium: { url: '' },
          high: { url: '' }
        },
        tags: ['gaming', 'The Witcher 3: Wild Hunt', 'rpg']
      };

      const result = extractGameFromMetadata(metadata);
      expect(result).toBe('The Witcher 3: Wild Hunt');
    });

    it('should return null when no game can be extracted', () => {
      const metadata: YouTubeVideoMetadata = {
        title: 'Random Video',
        channelTitle: 'Creator',
        channelId: 'UC123',
        publishedAt: '2022-02-25T00:00:00Z',
        description: 'Random content',
        thumbnails: {
          default: { url: '' },
          medium: { url: '' },
          high: { url: '' }
        },
        tags: ['music', 'fun']
      };

      const result = extractGameFromMetadata(metadata);
      expect(result).toBeNull();
    });
  });

  describe('createSlug', () => {
    it('should create proper slug from text', () => {
      expect(createSlug('Elden Ring')).toBe('elden-ring');
      expect(createSlug('The Witcher 3: Wild Hunt')).toBe('the-witcher-3-wild-hunt');
      expect(createSlug('Game with Special Characters!')).toBe('game-with-special-characters');
      expect(createSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(createSlug('---Multiple---Dashes---')).toBe('multiple-dashes');
    });
  });
}); 