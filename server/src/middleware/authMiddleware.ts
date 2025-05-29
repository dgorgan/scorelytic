import { Request, Response, NextFunction } from 'express';

// TODO: Implement authentication middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder: allow all requests
  next();
};
