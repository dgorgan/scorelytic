import pino from 'pino';
import { Logtail } from '@logtail/node';
import { env } from '@/config/env';

const isProd = env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true' || env.NODE_ENV === 'test';
const logtailToken = env.LOGTAIL_SOURCE_TOKEN;

// Build transport targets array for pino v7+
const targets: any[] = [];

if (isProd && logtailToken) {
  // Logtail target: sends logs to Logtail cloud
  const logtail = new Logtail(logtailToken);
  targets.push({
    target: '@logtail/pino',
    options: { logtail },
    level: 'info',
  });
  // Stdout target: keeps logs visible in console (e.g., Docker, cloud logs)
  targets.push({
    target: 'pino/file',
    options: { destination: 1 }, // 1 = stdout
    level: 'info',
  });
}

const logger = isCI
  ? pino(
      {
        level: isProd ? 'info' : 'debug',
        base: { service: 'backend-api' },
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination(1),
    )
  : pino({
      level: isProd ? 'info' : 'debug',
      base: { service: 'backend-api' },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: isProd
        ? targets.length
          ? { targets }
          : undefined
        : {
            // In dev, use pino-pretty for colorized, readable logs
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              singleLine: true,
            },
          },
    });

export default logger;
