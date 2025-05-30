import { Game } from '@/models/Game';
import { Creator } from '@/models/Creator';
import { Review } from '@/models/Review';

describe('Supabase Model Types', () => {
  it('Game type should accept valid data', () => {
    const game: Game = {
      id: 'game-1',
      title: 'Test Game',
      slug: 'test-game',
      coverArtUrl: 'https://example.com/test.jpg',
      releaseDate: '2023-01-01',
      metaCriticScore: 90,
      description: 'A test game',
      contentCriticScore: 88,
    };
    expect(game.title).toBe('Test Game');
  });

  it('Creator type should accept valid data', () => {
    const creator: Creator = {
      id: 'creator-1',
      name: 'Test Creator',
      slug: 'test-creator',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Bio',
      channelUrl: 'https://youtube.com/test',
    };
    expect(creator.name).toBe('Test Creator');
  });

  it('Review type should accept valid data', () => {
    const review: Review = {
      id: 'review-1',
      gameId: 'game-1',
      creatorId: 'creator-1',
      videoUrl: 'https://youtube.com/review',
      score: 8.5,
      pros: ['Good'],
      cons: ['Bad'],
      sentimentSummary: 'Positive',
      biasIndicators: [],
      alsoRecommends: [],
      createdAt: '2023-01-01T00:00:00Z',
      transcript: 'Test transcript',
      reviewSummary: 'Test summary',
    };
    expect(review.score).toBe(8.5);
  });
});
