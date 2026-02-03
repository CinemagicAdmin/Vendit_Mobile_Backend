import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { couponValidationLimiter } from '../middleware/rate-limiters.js';
import {
  validateCouponApi,
  listAvailableCouponsApi
} from '../modules/coupons/user-coupons.controller.js';

const router = Router();

// All user coupon routes require JWT authentication
router.use(requireAuth);

/**
 * @route POST /api/coupons/validate
 * @description Validate a coupon code and calculate discount
 * @body code, amount, products[]
 * @access Authenticated users
 */
router.post('/coupons/validate', couponValidationLimiter, validateCouponApi);

/**
 * @route GET /api/coupons/available
 * @description List available coupons for the current user
 * @access Authenticated users
 */
router.get('/coupons/available', listAvailableCouponsApi);

export default router;
