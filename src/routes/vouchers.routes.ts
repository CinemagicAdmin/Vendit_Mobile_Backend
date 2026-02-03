import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { voucherRedemptionLimiter } from '../middleware/rate-limiters.js';
import {
  redeemVoucherApi,
  getUserRedemptionHistory
} from '../modules/vouchers/user-vouchers.controller.js';

const router = Router();

// All user voucher routes require JWT authentication
router.use(requireAuth);

/**
 * @route POST /api/vouchers/redeem
 * @description Redeem a voucher code and receive wallet credit
 * @body code
 * @access Authenticated users
 */
router.post('/redeem', voucherRedemptionLimiter, redeemVoucherApi);

/**
 * @route GET /api/vouchers/history
 * @description Get user's voucher redemption history
 * @query page, limit
 * @access Authenticated users
 */
router.get('/history', getUserRedemptionHistory);

export default router;
