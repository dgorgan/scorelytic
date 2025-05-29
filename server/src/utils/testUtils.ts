import supertest from 'supertest';
import type { Express } from 'express';

export const request = (app: Express) => supertest(app);

export const mockResetAll = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};
