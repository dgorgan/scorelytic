import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/shared/types/api';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
} 