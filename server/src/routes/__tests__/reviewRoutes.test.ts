import express from 'express';
import request from 'supertest';

jest.mock('@/services/sentiment', () => ({
  analyzeSentiment: jest.fn(async (text: string) => ({
    summary: 'R',
    sentimentScore: 2,
    verdict: 'negative',
  })),
}));

jest.mock('@/config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [{ id: '1', transcript: 'foo' }],
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [{}], error: null })),
      })),
    })),
  },
}));

import reviewRoutes from '../review';
import { analyzeSentiment } from '../../services/sentiment';
import { supabase } from '../../config/database';
import { getReviewMetadata } from '../../services/youtube/reviewMetadataService';

describe('reviewRoutes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/review', reviewRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns sentiment for valid review', async () => {
    const res = await request(app).post('/api/review/analyze').send({ reviewId: '1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        reviewId: '1',
        sentiment: { summary: 'R', sentimentScore: 2, verdict: 'negative' },
        metadata: {
          gameTitle: 'Sample Game',
          creatorName: 'Game Reviewer',
          publishedAt: expect.any(String),
        },
      },
    });
  });

  it('404s if review not found', async () => {
    jest
      .spyOn(require('../../services/youtube/reviewMetadataService'), 'getReviewMetadata')
      .mockResolvedValueOnce(null);
    const res = await request(app).post('/api/review/analyze').send({ reviewId: '404' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: expect.any(String) });
  });

  it('400s if no transcript', async () => {
    jest
      .spyOn(require('../../services/youtube/reviewMetadataService'), 'getReviewMetadata')
      .mockResolvedValueOnce({
        gameTitle: 'Sample Game',
        channelTitle: 'Game Reviewer',
        publishedAt: new Date().toISOString(),
        description: '',
      });
    const res = await request(app).post('/api/review/analyze').send({ reviewId: '2' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: expect.any(String) });
  });

  it('500s on analyzeSentiment error', async () => {
    (analyzeSentiment as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/review/analyze').send({ reviewId: '1' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: expect.stringMatching(/fail/),
    });
  });
});
