import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@scorelytic/shared';
import logger from '@/logger';
import Sentry from '@/sentry';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse<any>>,
  _next: NextFunction,
) {
  logger.error(err);
  if (Sentry && typeof Sentry.captureException === 'function') {
    Sentry.captureException(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
