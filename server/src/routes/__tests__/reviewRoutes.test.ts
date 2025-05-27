const express = require('express');
import request from 'supertest';

jest.mock('../../services/sentimentService', () => ({
  analyzeText: jest.fn(async (text: string) => ({ summary: 'R', sentimentScore: 2, verdict: 'negative' }))
}));

jest.mock('../../config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [{ id: '1', transcript: 'foo' }], error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [{}], error: null }))
      }))
    }))
  }
}));

import reviewRoutes from '../reviewRoutes';
import { analyzeText } from '../../services/sentimentService';
import { supabase } from '../../config/database';

describe('reviewRoutes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sentiment for valid review', async () => {
    const res = await request(app)
      .post('/api/reviews/1/analyze')
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: 'R', sentimentScore: 2, verdict: 'negative' });
  });

  it('404s if review not found', async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    });
    const res = await request(app)
      .post('/api/reviews/404/analyze')
      .send();
    expect(res.status).toBe(404);
  });

  it('400s if no transcript', async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [{ id: '2' }], error: null }))
        }))
      }))
    });
    const res = await request(app)
      .post('/api/reviews/2/analyze')
      .send();
    expect(res.status).toBe(400);
  });

  it('500s on analyzeText error', async () => {
    (analyzeText as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app)
      .post('/api/reviews/1/analyze')
      .send();
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/fail/);
  });
}); 