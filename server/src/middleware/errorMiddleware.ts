import { Request, Response, NextFunction } from 'express';

// TODO: Implement error handling middleware
export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err.message });
};
