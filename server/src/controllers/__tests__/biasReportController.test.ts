import request from 'supertest';
import express from 'express';
import biasReportRoutes from '@/routes/biasReport';

jest.resetModules();

const app = express();
app.use(express.json());
app.use('/api/bias-report', biasReportRoutes);

describe('biasReportController', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app).post('/api/bias-report/generate').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 200 and a report for valid input', async () => {
    const res = await request(app)
      .post('/api/bias-report/generate')
      .send({ sentimentScore: 0.7, biasIndicators: ['nostalgia bias'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toBeDefined();
  });

  it('should return 500 on internal error', async () => {
    jest.resetModules();
    jest.doMock('@scorelytic/shared', () => ({
      generateBiasReport: () => {
        throw new Error('fail');
      },
    }));
    // Re-require after mocking
    const biasReportRoutesReloaded = require('@/routes/biasReport').default;
    const appWithMock = express();
    appWithMock.use(express.json());
    appWithMock.use('/api/bias-report', biasReportRoutesReloaded);
    const res = await request(appWithMock)
      .post('/api/bias-report/generate')
      .send({ sentimentScore: 0.7, biasIndicators: ['nostalgia bias'] });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
