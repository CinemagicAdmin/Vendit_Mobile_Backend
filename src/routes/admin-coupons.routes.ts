import { Router } from 'express';
import { cookieAuth } from '../middleware/cookie-auth.middleware.js';
import { adminLimiter } from '../middleware/rate-limiters.js';
import {
  createCouponApi,
  listCouponsApi,
  getCouponDetailsApi,
  updateCouponApi,
  deleteCouponApi,
  deactivateCouponApi,
  getCouponUsageHistoryApi
} from '../modules/coupons/admin-coupons.controller.js';

const router = Router();

// All admin coupon routes require authentication
router.use(cookieAuth);
router.use(adminLimiter);

/**
 * @route POST /admin/coupons
 * @description Create a new discount coupon
 * @access Admin only
 */
router.post('/coupons', createCouponApi);

/**
 * @route GET /admin/coupons
 * @description List all coupons with pagination and filters
 * @query page, limit, status, search
 * @access Admin only
 */
router.get('/coupons', listCouponsApi);

/**
 * @route GET /admin/coupons/:id
 * @description Get coupon details with statistics
 * @access Admin only
 */
router. get('/coupons/:id', getCouponDetailsApi);

/**
 * @route PUT /admin/coupons/:id
 * @description Update a coupon
 * @access Admin only
 */
router.put('/coupons/:id', updateCouponApi);

/**
 * @route DELETE /admin/coupons/:id
 * @description Delete a coupon
 * @access Admin only
 */
router.delete('/coupons/:id', deleteCouponApi);

/**
 * @route PATCH /admin/coupons/:id/deactivate
 * @description Deactivate a coupon
 * @access Admin only
 */
router.patch('/coupons/:id/deactivate', deactivateCouponApi);

/**
 * @route GET /admin/coupons/:id/usage
 * @description Get coupon usage history
 * @query page, limit
 * @access Admin only
 */
router.get('/coupons/:id/usage', getCouponUsageHistoryApi);

export default router;
