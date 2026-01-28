import type { Request, Response } from 'express';
import { validateCouponSchema } from './coupons.validators.js';
import {
  validateCouponService,
  listAvailableCouponsService
} from './coupons.service.js';

/**
 * Validate a coupon code (user endpoint)
 * POST /api/coupons/validate
 */
export const validateCouponApi = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  // Validate input
  const validation = validateCouponSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.issues
    });
  }
  
  const result = await validateCouponService(userId, validation.data);
  
  return res.json(result);
};

/**
 * List available coupons for the user
 * GET /api/coupons/available
 */
export const listAvailableCouponsApi = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  const result = await listAvailableCouponsService(userId);
  
  return res.json(result);
};
