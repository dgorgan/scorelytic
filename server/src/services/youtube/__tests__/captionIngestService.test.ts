import { normalizeYoutubeToReview, fetchYoutubeCaptions } from '../captionIngestService';
import * as captionsScraper from 'youtube-captions-scraper';

// Mock the database module with correct path
jest.mock('../../../config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'mock-game-id' },
        error: null,
      }),
      insert: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('normalizeYoutubeToReview', () => {
  it('returns all required fields and auto-creates game/creator', async () => {
    const review = await normalizeYoutubeToReview({
      videoId: 'testid',
      transcript: 'test transcript',
      gameSlug: 'test-game',
      creatorSlug: 'test-creator',
      gameTitle: 'Test Game',
      creatorName: 'Test Creator',
      channelUrl: 'https://youtube.com/test-creator',
    });
    expect(review).toHaveProperty('gameId');
    expect(review).toHaveProperty('creatorId');
    expect(review.transcript).toBe('test transcript');
    expect(typeof review.gameId).toBe('string');
    expect(typeof review.creatorId).toBe('string');
  });
});

describe('fetchYoutubeCaptions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should handle no captions available', async () => {
    jest.spyOn(captionsScraper, 'getSubtitles').mockResolvedValue([]);
    await expect(fetchYoutubeCaptions('videoId')).rejects.toThrow(/No English captions available/);
  });

  it('should handle captions in wrong language', async () => {
    jest.spyOn(captionsScraper, 'getSubtitles').mockResolvedValue([]);
    await expect(fetchYoutubeCaptions('videoId', 'es')).rejects.toThrow(
      /No English captions available/,
    );
  });

  it('should handle getSubtitles error', async () => {
    jest.spyOn(captionsScraper, 'getSubtitles').mockRejectedValue(new Error('fetch fail'));
    await expect(fetchYoutubeCaptions('videoId')).rejects.toThrow('fetch fail');
  });
});
