import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { getConfig } from '../../config/env.js';
import { authenticateAdmin, changeAdminPassword } from './admin-auth.service.js';
import { apiError, apiSuccess, errorResponse } from '../../utils/response.js';
import { audit } from '../../utils/audit.js';
import { setSession } from '../../libs/session.js';
import type { Request, Response } from 'express';

const config = getConfig();

/**
 * Generate JWT token for admin
 */
const generateAdminToken = (adminId: string, email: string, name: string | null, role: string = 'admin'): string => {
  return jwt.sign({ id: adminId, adminId, email, name, role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl || '15m'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (adminId: string): string => {
  return jwt.sign({ id: adminId, adminId, type: 'refresh' }, config.jwtRefreshSecret || config.jwtAccessSecret, {
    expiresIn: '30d'
  });
};

/**
 * Generate CSRF token
 */
const generateCsrfToken = (): string => {
  return randomBytes(32).toString('hex');
};

/**
 * API: Admin login - sets httpOnly cookies (web) or returns token (mobile)
 */
export const loginApi = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new apiError(400, 'Email and password are required');
    }

    const admin = await authenticateAdmin(email, password);
    const accessToken = generateAdminToken(admin.id, admin.email, admin.name, admin.role || 'admin');
    const refreshToken = generateRefreshToken(admin.id);
    const csrfToken = generateCsrfToken();

    // Log admin login
    await audit.adminLogin(admin.id, admin.email, req);

    // Store session in Redis
    await setSession(admin.id, refreshToken, {
      userId: admin.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: req.headers['x-mobile-client'] === 'true' ? 'mobile' : 'web'
    });

    // Check if mobile client (backward compatibility)
    const isMobileClient = req.headers['x-mobile-client'] === 'true';

    if (isMobileClient) {
      // Mobile: Return tokens in response body (legacy behavior)
      return res.json(
        apiSuccess(
          {
            token: accessToken,
            refreshToken,
            admin: {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              role: admin.role
            }
          },
          'Login successful'
        )
      );
    }

    // Web: Set httpOnly cookies
    const isProduction = config.nodeEnv === 'production';
    
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false, // Accessible to JavaScript for CSRF validation
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json(
      apiSuccess(
        {
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          },
          csrfToken // Send CSRF token in response for client to use in headers
        },
        'Login successful'
      )
    );
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(errorResponse(statusCode, error.message || 'Login failed'));
  }
};

/**
 * API: Get current admin info
 */
export const getMeApi = async (req: Request, res: Response) => {
  try {
    // Admin info is attached by requireAdminToken middleware
    const admin = (req as any).admin;

    if (!admin) {
      throw new apiError(401, 'Not authenticated');
    }

    return res.json(
      apiSuccess({
        admin: {
          id: admin.adminId,
          email: admin.email,
          name: admin.name
        }
      })
    );
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to get admin info'));
  }
};

/**
 * API: Admin logout - clears cookies and revokes session
 */
export const logoutApi = async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const refreshToken = req.cookies?.refresh_token;
  
  if (admin?.adminId || admin?.id) {
    const adminId = admin.adminId || admin.id;
    await audit.adminLogout(adminId, req);
    
    // Revoke all sessions for this user
    if (refreshToken) {
      const { revokeSession } = await import('../../libs/session.js');
      await revokeSession(adminId, refreshToken);
    }
  }
  
  // Clear all auth cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  
  return res.json(apiSuccess(null, 'Logout successful'));
};

/**
 * API: Change admin password
 */
export const changePasswordApi = async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new apiError(400, 'Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new apiError(400, 'New password must be at least 8 characters');
    }

    await changeAdminPassword(admin.adminId, currentPassword, newPassword);

    // Log password change
    await audit.adminAction(
      admin.adminId,
      'admin',
      admin.adminId,
      { action: 'password_changed' },
      req
    );

    return res.json(apiSuccess(null, 'Password changed successfully'));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to change password'));
  }
};
