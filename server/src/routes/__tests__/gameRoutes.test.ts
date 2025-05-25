import request from 'supertest';
import app from '../../../app';
import * as db from '../../../config/database';

describe('GET /api/games/:id', () => {
  const gameId = 'test-game-id';
  const mockGame = {
    id: gameId,
    title: 'Test Game',
    slug: 'test-game',
    description: 'desc',
    coverArtUrl: 'url',
    releaseDate: '2022-01-01',
    metaCriticScore: 90,
    contentCriticScore: 88
  };
  const mockReviews = [
    {
      id: 'r1',
      gameId,
      creatorId: 'c1',
      videoUrl: 'v1',
      score: 9,
      pros: ['p'],
      cons: ['c'],
      sentimentSummary: 'positive',
      biasIndicators: [],
      alsoRecommends: [],
      createdAt: '2022-01-02'
    }
  ];
  const mockCreators = [
    {
      id: 'c1',
      name: 'Creator',
      slug: 'creator',
      avatarUrl: 'a',
      bio: 'b',
      channelUrl: 'ch'
    }
  ];
  beforeEach(() => {
    jest.spyOn(db.supabase.from('games'), 'select').mockReturnValue({ eq: () => ({ single: async () => ({ data: mockGame, error: null }) }) } as any);
    jest.spyOn(db.supabase.from('reviews'), 'select').mockReturnValue({ eq: () => ({ order: () => ({ data: mockReviews, error: null }) }) } as any);
    jest.spyOn(db.supabase.from('creators'), 'select').mockReturnValue({ in: () => ({ data: mockCreators, error: null }) } as any);
  });
  afterEach(() => jest.restoreAllMocks());
  it('returns game, reviews, creators, and sentiment summary', async () => {
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.game).toMatchObject(mockGame);
    expect(res.body.reviews[0].creator).toMatchObject(mockCreators[0]);
    expect(res.body.averageSentimentScore).toBe(9);
    expect(res.body.sentimentSummaries).toContain('positive');
  });
  it('returns 404 if game not found', async () => {
    jest.spyOn(db.supabase.from('games'), 'select').mockReturnValue({ eq: () => ({ single: async () => ({ data: null, error: 'not found' }) }) } as any);
    const res = await request(app).get(`/api/games/doesnotexist`);
    expect(res.status).toBe(404);
  });
  it('returns 500 if review fetch fails', async () => {
    jest.spyOn(db.supabase.from('reviews'), 'select').mockReturnValue({ eq: () => ({ order: () => ({ data: null, error: 'fail' }) }) } as any);
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(500);
  });
  it('returns 500 if creator fetch fails', async () => {
    jest.spyOn(db.supabase.from('creators'), 'select').mockReturnValue({ in: () => ({ data: null, error: 'fail' }) } as any);
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(500);
  });
}); 