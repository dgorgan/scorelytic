import { normalizeYoutubeToReview } from '../captionIngestService';

describe('normalizeYoutubeToReview', () => {
  it('returns all required fields and auto-creates game/creator', async () => {
    const review = await normalizeYoutubeToReview({
      videoId: 'testid',
      transcript: 'test transcript',
      gameSlug: 'test-game',
      creatorSlug: 'test-creator',
      gameTitle: 'Test Game',
      creatorName: 'Test Creator',
      channelUrl: 'https://youtube.com/test-creator'
    });
    expect(review).toHaveProperty('gameId');
    expect(review).toHaveProperty('creatorId');
    expect(review.transcript).toBe('test transcript');
    expect(typeof review.gameId).toBe('string');
    expect(typeof review.creatorId).toBe('string');
  });
}); 