import type { Request, Response, NextFunction } from 'express';
import { createRequestLogger } from '../config/logger.js';

// Simple request logger using existing pino logger
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Create and attach child logger with request context
  const reqLogger = createRequestLogger(req);
  (req as any).log = reqLogger;
  
  // Skip logging for health checks and static assets
  const excludePaths = ['/api/health', '/assets'];
  if (excludePaths.some((path) => req.path.startsWith(path))) {
    return next();
  }
  
  // Log request
  reqLogger.info(
    {
      request: {
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
        ip: req.ip
      }
    },
    `→ ${req.method} ${req.url}`
  );
  
  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    reqLogger.info(
      {
        response: {
          statusCode: res.statusCode,
          duration
        }
      },
      `← ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );
    return originalSend.call(this, data);
  };
  next();
};
