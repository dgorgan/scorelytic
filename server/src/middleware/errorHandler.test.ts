import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';

describe('errorHandler middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Route that throws
    app.get('/error', (_req, _res, next) => {
      next(new Error('Test error'));
    });
    // Route that throws non-Error
    app.get('/non-error', (_req, _res, next) => {
      next('string error');
    });
    // Route that throws Sentry error
    app.get('/sentry', (_req, res, next) => {
      (res as any).sentry = 'sentry-id';
      next(new Error('Sentry error'));
    });
    app.use(errorHandler);
  });

  it('returns 500 and generic error message for normal errors', async () => {
    const res = await request(app).get('/error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Internal server error' });
  });

  it('returns 500 and generic error message for non-Error thrown', async () => {
    const res = await request(app).get('/non-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Internal server error' });
  });

  it('returns 500 and generic error message even if sentry id is present', async () => {
    const res = await request(app).get('/sentry');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Internal server error' });
  });
});
