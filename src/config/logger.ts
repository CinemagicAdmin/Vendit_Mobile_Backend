import pino from 'pino';
import type { Request } from 'express';

// Base logger instance
export const logger = pino({
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } }
      : undefined,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: {
    service: 'vend-it-backend'
  },
  formatters: {
    level: (label) => ({ level: label })
  }
});

// Create a child logger with request context
export const createRequestLogger = (req: Request) => {
  const correlationId = req.correlationId || req.get('x-correlation-id') || req.get('x-request-id') || 'unknown';
  return logger.child({
    requestId: correlationId,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id
  });
};

// Helper to get logger with request context from request object
export const getRequestLogger = (req: Request) => {
  // Check if request already has a logger attached
  if ((req as any).log) {
    return (req as any).log;
  }
  return createRequestLogger(req);
};
