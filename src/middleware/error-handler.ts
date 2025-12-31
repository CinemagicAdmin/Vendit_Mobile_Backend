import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/response.js';
import { BaseApiError, ErrorCode } from '../utils/errors.js';
import { getConfig } from '../config/env.js';

/**
 * Extract correlation ID from request
 */
const getCorrelationId = (req: Request): string | undefined => {
  return (req as any).correlationId || (req.headers['x-correlation-id'] as string | undefined);
};

/**
 * Extract request context for error logging
 */
const getRequestContext = (req: Request) => ({
  method: req.method,
  url: req.originalUrl || req.url,
  path: req.path,
  query: req.query,
  userId: req.user?.id ?? null,
  ip: req.ip ?? req.socket?.remoteAddress ?? null,
  userAgent: req.headers['user-agent'] ?? null,
  contentType: req.headers['content-type'] ?? null,
  referer: req.headers['referer'] ?? null,
  correlationId: getCorrelationId(req)
});

/**
 * Sanitize error details for production
 */
const sanitizeError = (err: Error, isDev: boolean) => {
  if (isDev) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }
  return {
    name: err.name,
    message: err.message
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const config = getConfig();
  const isDev = config.nodeEnv === 'development';
  const requestContext = getRequestContext(req);
  const correlationId = getCorrelationId(req);

  // Log error with full context
  logger.error(
    {
      err: sanitizeError(err, true),
      request: requestContext,
      correlationId
    },
    `Error: ${err.message}`
  );

  // Handle new error class hierarchy
  if (err instanceof BaseApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle legacy ApiError for backward compatibility
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ...err.toJSON(),
      correlationId,
      ...(isDev && { requestId: requestContext.url })
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 400,
      error: 'ValidationError',
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      })),
      correlationId,
      timestamp: new Date().toISOString(),
      ...(isDev && { requestId: requestContext.url })
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 401,
      error: 'AuthenticationError',
      code: ErrorCode.INVALID_TOKEN,
      message: 'Invalid token',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 401,
      error: 'AuthenticationError',
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Token expired',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }

  // Handle syntax errors in JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 400,
      error: 'ValidationError',
      code: ErrorCode.INVALID_FORMAT,
      message: 'Invalid JSON in request body',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }

  // Generic internal server error
  return res.status(500).json({
    status: 500,
    error: 'InternalServerError',
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: isDev ? err.message : 'Internal server error',
    correlationId,
    timestamp: new Date().toISOString(),
    ...(isDev && {
      details: sanitizeError(err, true),
      requestId: requestContext.url
    })
  });
};
