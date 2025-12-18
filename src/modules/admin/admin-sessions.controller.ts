import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { getUserSessions, revokeAllUserSessions } from '../../libs/session.js';
import { apiSuccess, errorResponse } from '../../utils/response.js';
import { logger } from '../../config/logger.js';

/**
 * Get all active sessions for logged-in admin
 * GET /api/admin/sessions
 */
export const getSessionsApi = async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;

    if (!adminId) {
      return res.status(401).json(errorResponse(401, 'Not authenticated'));
    }

    const sessions = await getUserSessions(adminId);

    // Transform sessions for client
    const clientSessions = sessions.map((session) => {
      const currentTokenHash = req.cookies?.refresh_token 
        ? createHash('sha256').update(req.cookies.refresh_token).digest('hex')
        : null;
        
      return {
        id: session.refreshTokenHash.slice(0, 16), // Shortened hash as ID
        deviceInfo: session.deviceInfo || 'unknown',
        ipAddress: session.ipAddress || 'unknown',
        userAgent: session.userAgent || 'unknown',
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        isCurrent: currentTokenHash === session.refreshTokenHash
      };
    });

    return res.json(
      apiSuccess(
        {
          sessions: clientSessions,
          count: clientSessions.length
        },
        'Sessions retrieved successfully'
      )
    );
  } catch (error: any) {
    logger.error({ error }, 'Failed to get sessions');
    return res.status(500).json(errorResponse(500, 'Failed to retrieve sessions'));
  }
};

/**
 * Revoke a specific session
 * DELETE /api/admin/sessions/:sessionId
 */
export const revokeSessionApi = async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    const { sessionId } = req.params;

    if (!adminId) {
      return res.status(401).json(errorResponse(401, 'Not authenticated'));
    }

    // Get all sessions to find the matching one
    const sessions = await getUserSessions(adminId);
    const targetSession = sessions.find((s) => s.refreshTokenHash.startsWith(sessionId));

    if (!targetSession) {
      return res.status(404).json(errorResponse(404, 'Session not found'));
    }

    // We can't revoke without the actual refresh token
    // This endpoint is more for showing sessions
    // Actual revocation happens via logout or token refresh
    
    return res.json(
      apiSuccess(
        null,
        'Session revocation requires the refresh token. Use logout endpoint instead.'
      )
    );
  } catch (error: any) {
    logger.error({ error }, 'Failed to revoke session');
    return res.status(500).json(errorResponse(500, 'Failed to revoke session'));
  }
};

/**
 * Revoke all sessions (logout all devices)
 * POST /api/admin/sessions/revoke-all
 */
export const revokeAllSessionsApi = async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;

    if (!adminId) {
      return res.status(401).json(errorResponse(401, 'Not authenticated'));
    }

    const count = await revokeAllUserSessions(adminId);

    // Clear cookies for current session
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('csrf_token');

    logger.info({ adminId, count }, 'All sessions revoked');

    return res.json(
      apiSuccess(
        { sessionsRevoked: count },
        'All sessions have been revoked. You have been logged out.'
      )
    );
  } catch (error: any) {
    logger.error({ error }, 'Failed to revoke all sessions');
    return res.status(500).json(errorResponse(500, 'Failed to revoke all sessions'));
  }
};
