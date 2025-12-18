import { createHash } from 'crypto';
import { redis } from './redis.js';
import { logger } from '../config/logger.js';

/**
 * Session data stored in Redis
 */
export interface Session {
  userId: string;
  refreshTokenHash: string;
  createdAt: number;
  expiresAt: number;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

const SESSION_PREFIX = 'session';
const USER_SESSIONS_PREFIX = 'sessions';
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Hash refresh token for storage
 */
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

/**
 * Generate session key
 */
const getSessionKey = (userId: string, tokenHash: string): string => {
  return `${SESSION_PREFIX}:${userId}:${tokenHash}`;
};

/**
 * Generate user sessions set key
 */
const getUserSessionsKey = (userId: string): string => {
  return `${USER_SESSIONS_PREFIX}:${userId}`;
};

/**
 * Store a new session in Redis
 */
export const setSession = async (
  userId: string,
  refreshToken: string,
  sessionData: Omit<Session, 'refreshTokenHash'>
): Promise<boolean> => {
  try {
    const tokenHash = hashToken(refreshToken);
    const sessionKey = getSessionKey(userId, tokenHash);
    const userSessionsKey = getUserSessionsKey(userId);

    const session: Session = {
      ...sessionData,
      refreshTokenHash: tokenHash
    };

    // Store session data
    await redis.setex(sessionKey, SESSION_TTL, JSON.stringify(session));

    // Add to user's active sessions set
    await redis.sadd(userSessionsKey, tokenHash);
    await redis.expire(userSessionsKey, SESSION_TTL);

    logger.debug({ userId, tokenHash: tokenHash.slice(0, 8) }, 'Session stored');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to store session');
    return false;
  }
};

/**
 * Get session from Redis
 */
export const getSession = async (
  userId: string,
  refreshToken: string
): Promise<Session | null> => {
  try {
    const tokenHash = hashToken(refreshToken);
    const sessionKey = getSessionKey(userId, tokenHash);

    const data = await redis.get(sessionKey);
    if (!data) {
      logger.debug({ userId, tokenHash: tokenHash.slice(0, 8) }, 'Session not found');
      return null;
    }

    const session = JSON.parse(data) as Session;
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      logger.debug({ userId }, 'Session expired');
      await revokeSession(userId, refreshToken);
      return null;
    }

    return session;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get session');
    return null;
  }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (
  userId: string,
  refreshToken: string
): Promise<boolean> => {
  try {
    const tokenHash = hashToken(refreshToken);
    const sessionKey = getSessionKey(userId, tokenHash);
    const userSessionsKey = getUserSessionsKey(userId);

    // Delete session
    await redis.del(sessionKey);

    // Remove from user's sessions set
    await redis.srem(userSessionsKey, tokenHash);

    logger.info({ userId, tokenHash: tokenHash.slice(0, 8) }, 'Session revoked');
    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to revoke session');
    return false;
  }
};

/**
 * Revoke all sessions for a user
 */
export const revokeAllUserSessions = async (userId: string): Promise<number> => {
  try {
    const userSessionsKey = getUserSessionsKey(userId);

    // Get all session hashes
    const sessionHashes = await redis.smembers(userSessionsKey);

    if (!sessionHashes || sessionHashes.length === 0) {
      return 0;
    }

    // Delete all sessions
    const deletePromises = sessionHashes.map((hash) => {
      const sessionKey = getSessionKey(userId, hash);
      return redis.del(sessionKey);
    });

    await Promise.all(deletePromises);

    // Clear the user sessions set
    await redis.del(userSessionsKey);

    logger.info({ userId, count: sessionHashes.length }, 'All user sessions revoked');
    return sessionHashes.length;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to revoke all user sessions');
    return 0;
  }
};

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId: string): Promise<Session[]> => {
  try {
    const userSessionsKey = getUserSessionsKey(userId);

    // Get all session hashes
    const sessionHashes = await redis.smembers(userSessionsKey);

    if (!sessionHashes || sessionHashes.length === 0) {
      return [];
    }

    // Get all session data
    const sessionPromises = sessionHashes.map(async (hash) => {
      const sessionKey = getSessionKey(userId, hash);
      const data = await redis.get(sessionKey);
      return data ? (JSON.parse(data) as Session) : null;
    });

    const sessions = await Promise.all(sessionPromises);

    // Filter out null sessions and expired ones
    return sessions.filter((s): s is Session => {
      return s !== null && Date.now() <= s.expiresAt;
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user sessions');
    return [];
  }
};

/**
 * Cleanup expired sessions (called by scheduler)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    logger.info('Starting session cleanup');
    
    // Redis automatically expires keys with TTL
    // This function is mainly for logging/monitoring
    
    // In a real implementation, you might scan for session keys
    // and manually cleanup, but Redis TTL handles this automatically
    
    logger.info('Session cleanup completed (handled by Redis TTL)');
    return 0;
  } catch (error) {
    logger.error({ error }, 'Session cleanup failed');
    return 0;
  }
};
