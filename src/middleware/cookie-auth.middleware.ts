import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';
import { AuthenticationError, ErrorCode } from '../utils/errors.js';
import { logger } from '../config/logger.js';

/**
 * Cookie-based authentication middleware
 * Supports both cookie-based (web) and header-based (mobile) authentication
 */

interface JWTPayload {
  id: string;
  email: string;
  role?: string;
  [key: string]: any;
}

/**
 * Extract JWT token from cookies or Authorization header
 */
const extractToken = (req: Request): string | null => {
  // Try cookie first (web clients)
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }

  // Fall back to Authorization header (mobile clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Verify JWT token
 */
const verifyToken = (token: string, secret: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (_error) {
    return null;
  }
};

/**
 * Cookie-based auth middleware for admin panel
 */
export const cookieAuth = async (req: Request, res: Response, next: NextFunction) => {
  const config = getConfig();
  const correlationId = (req as any).correlationId;

  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError(
        'No authentication token provided',
        ErrorCode.AUTHENTICATION_FAILED,
        null,
        correlationId
      );
    }

    const decoded = verifyToken(token, config.jwtAccessSecret);

    if (!decoded) {
      throw new AuthenticationError(
        'Invalid or expired token',
        ErrorCode.TOKEN_EXPIRED,
        null,
        correlationId
      );
    }

    // Attach user/admin to request
    if (decoded.role === 'admin' || decoded.role === 'sub_admin') {
      req.admin = decoded;
    } else {
      req.user = decoded;
    }

    // Check if token is close to expiry (less than 5 minutes remaining)
    if (decoded.exp) {
      const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      if (timeToExpiry < 300 && timeToExpiry > 0) {
        // Token expires in less than 5 minutes, refresh it
        logger.info({ userId: decoded.id, timeToExpiry }, 'Token close to expiry, refreshing');

        // Generate new access token
        const newToken = jwt.sign(
          {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
          },
          config.jwtAccessSecret,
          { expiresIn: config.accessTokenTtl || '15m' }
        );

        // Set new cookie (if original was cookie-based)
        if (req.cookies?.access_token) {
          res.cookie('access_token', newToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
          });
        }
      }
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      // Clear invalid  cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw error;
    }

    logger.error({ error, correlationId }, 'Cookie auth middleware error');
    throw new AuthenticationError(
      'Authentication failed',
      ErrorCode.AUTHENTICATION_FAILED,
      null,
      correlationId
    );
  }
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export const optionalCookieAuth = async (req: Request, res: Response, next: NextFunction) => {
  const config = getConfig();

  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token, config.jwtAccessSecret);

      if (decoded) {
        if (decoded.role === 'admin' || decoded.role === 'sub_admin') {
          req.admin = decoded;
        } else {
          req.user = decoded;
        }
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    logger.debug({ error }, 'Optional auth failed');
    next();
  }
};

/**
 * Validate CSRF token for cookie-based requests
 */
export const validateCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Only validate CSRF for cookie-based auth (web clients)
  if (!req.cookies?.access_token) {
    return next(); // Skip CSRF validation for header-based auth (mobile)
  }

  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const csrfCookie = req.cookies?.csrf_token;

  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    const correlationId = (req as any).correlationId;
    throw new AuthenticationError(
      'Invalid CSRF token',
      ErrorCode.CSRF_TOKEN_INVALID,
      null,
      correlationId
    );
  }

  next();
};
