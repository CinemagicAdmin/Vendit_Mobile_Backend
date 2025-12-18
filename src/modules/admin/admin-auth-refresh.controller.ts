import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { getConfig } from '../../config/env.js';
import { apiSuccess, errorResponse } from '../../utils/response.js';
import { logger } from '../../config/logger.js';
import { getSession, revokeSession, setSession, revokeAllUserSessions } from '../../libs/session.js';
import { AuthenticationError, ErrorCode } from '../../utils/errors.js';

const config = getConfig();

interface RefreshTokenPayload {
  id: string;
  adminId: string;
  type: string;
}

/**
 * Generate new access token
 */
const generateAccessToken = (adminId: string, email: string, name: string | null, role: string = 'admin'): string => {
  return jwt.sign(
    { id: adminId, adminId, email, name, role },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenTtl || '15m' }
  );
};

/**
 * Generate new refresh token
 */
const generateRefreshToken = (adminId: string): string => {
  return jwt.sign(
    { id: adminId, adminId, type: 'refresh' },
    config.jwtRefreshSecret || config.jwtAccessSecret,
    { expiresIn: '30d' }
  );
};

/**
 * Refresh token endpoint with token rotation
 * POST /api/admin/auth/refresh
 */
export const refreshTokenApi = async (req: Request, res: Response) => {
  const correlationId = (req as any).correlationId;

  try {
    // Extract refresh token from cookie
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new AuthenticationError(
        'No refresh token provided',
        ErrorCode.INVALID_TOKEN,
        null,
        correlationId
      );
    }

    // Verify refresh token signature
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(
        refreshToken,
        config.jwtRefreshSecret || config.jwtAccessSecret
      ) as RefreshTokenPayload;
    } catch (_error) {
      throw new AuthenticationError(
        'Invalid or expired refresh token',
        ErrorCode.TOKEN_EXPIRED,
        null,
        correlationId
      );
    }

    const adminId = decoded.adminId || decoded.id;

    // Check if session exists in Redis (token reuse detection)
    const session = await getSession(adminId, refreshToken);

    if (!session) {
      // Token reuse detected! Revoke all sessions for security
      logger.warn(
        { adminId, correlationId },
        'Refresh token reuse detected - revoking all sessions'
      );
      await revokeAllUserSessions(adminId);

      throw new AuthenticationError(
        'Invalid session - all sessions have been revoked for security',
        ErrorCode.SESSION_EXPIRED,
        { reason: 'token_reuse_detected' },
        correlationId
      );
    }

    // Get admin info from database
    const { supabase } = await import('../../libs/supabase.js');
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name, role')
      .eq('id', adminId)
      .maybeSingle();

    if (adminError || !admin) {
      logger.error({ error: adminError, adminId }, 'Admin not found during refresh');
      throw new AuthenticationError(
        'Admin not found',
        ErrorCode.AUTHENTICATION_FAILED,
        null,
        correlationId
      );
    }

    // Generate NEW tokens (rotation)
    const newAccessToken = generateAccessToken(admin.id, admin.email, admin.name, admin.role);
    const newRefreshToken = generateRefreshToken(admin.id);

    // Store new session in Redis
    await setSession(admin.id, newRefreshToken, {
      userId: admin.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Revoke old refresh token (token rotation)
    await revokeSession(admin.id, refreshToken);

    // Set new cookies
    const isProduction = config.nodeEnv === 'production';

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    logger.info({ adminId, correlationId }, 'Token refresh successful');

    return res.json(
      apiSuccess(
        {
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          }
        },
        'Token refreshed successfully'
      )
    );
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      // Clear invalid cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.clearCookie('csrf_token');
      
      return res.status(error.statusCode).json(error.toJSON());
    }

    logger.error({ error, correlationId }, 'Token refresh failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(errorResponse(statusCode, error.message || 'Token refresh failed'));
  }
};
