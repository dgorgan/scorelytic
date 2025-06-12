import express from 'express';
import request from 'supertest';

jest.mock('@/services/sentiment', () => ({
  analyzeText: jest.fn(async (text: string) => ({
    summary: 'S',
    sentimentScore: 1,
    verdict: 'positive',
  })),
}));

import sentimentRoutes from '@/routes/sentiment';
import { analyzeText } from '@/services/sentiment';

describe('sentimentRoutes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sentiment', sentimentRoutes);

  it('returns sentiment for valid text', async () => {
    const res = await request(app).post('/api/sentiment/analyze').send({ text: 'Great!' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { sentiment: { score: 1, summary: 'S', verdict: 'positive' } },
    });
  });

  it('400s for missing text', async () => {
    const res = await request(app).post('/api/sentiment/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: expect.any(String) });
  });

  it('500s on analyzeText error', async () => {
    (analyzeText as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/sentiment/analyze').send({ text: 'bad' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: expect.stringMatching(/fail/),
    });
  });
});
