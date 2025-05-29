import { Request, Response, NextFunction } from 'express';
import logger from '@/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        status: res.statusCode,
        durationMs: durationMs.toFixed(2),
      },
      'Request completed',
    );
  });

  next();
};

export default requestLogger;
