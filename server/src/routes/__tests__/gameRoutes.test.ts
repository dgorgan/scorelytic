import request from 'supertest';
import app from '../../app';
// import * as db from '../../../config/database';

jest.mock('../../config/database', () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: {}, error: null })),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  
  return {
    supabase: {
      from: jest.fn(() => chain),
    },
  };
});
const db = require('../../config/database');

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
  let chain: any;
  beforeEach(() => {
    chain = db.supabase.from();
    chain.select.mockImplementation(() => chain);
    chain.eq.mockImplementation(() => chain);
    chain.order.mockImplementation(() => chain);
    chain.in.mockImplementation(() => chain);
    chain.single.mockImplementation(async () => ({ data: mockGame, error: null }));
    // reviews
    chain.order.mockImplementationOnce(() => ({ data: mockReviews, error: null }));
    // creators
    chain.in.mockImplementationOnce(() => ({ data: mockCreators, error: null }));
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
    chain.single.mockImplementationOnce(async () => ({ data: null, error: 'not found' }));
    const res = await request(app).get(`/api/games/doesnotexist`);
    expect(res.status).toBe(404);
  });
  it('returns 500 if review fetch fails', async () => {
    const originalFrom = db.supabase.from;
    db.supabase.from = jest.fn((table: string) => {
      if (table === 'reviews') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: 'fail' })
            })
          })
        };
      }
      return chain;
    });
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(500);
    db.supabase.from = originalFrom;
  });
  it('returns 500 if creator fetch fails', async () => {
    const originalFrom = db.supabase.from;
    db.supabase.from = jest.fn((table: string) => {
      if (table === 'creators') {
        return {
          select: () => ({
            in: async () => ({ data: null, error: 'fail' })
          })
        };
      }
      return chain;
    });
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(500);
    db.supabase.from = originalFrom;
  });
}); 