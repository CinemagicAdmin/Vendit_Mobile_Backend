import { Router } from 'express';
import { cookieAuth } from '../middleware/cookie-auth.middleware.js';
import { adminLimiter } from '../middleware/rate-limiters.js';
import {
  createVoucherApi,
  listVouchersApi,
  getVoucherDetailsApi,
  updateVoucherApi,
  deleteVoucherApi,
  toggleVoucherApi,
  getVoucherRedemptionsApi,
  downloadVoucherQRApi
} from '../modules/vouchers/admin-vouchers.controller.js';

const router = Router();

// All admin voucher routes require authentication
router.use(cookieAuth);
router.use(adminLimiter);

/**
 * @route POST /admin/vouchers
 * @description Create new voucher with QR code
 * @access Admin only
 */
router.post('/vouchers', createVoucherApi);

/**
 * @route GET /admin/vouchers
 * @description List all vouchers with filters
 * @query page, limit, search, status
 * @access Admin only
 */
router.get('/vouchers', listVouchersApi);

/**
 * @route GET /admin/vouchers/:id
 * @description Get voucher details with statistics
 * @access Admin only
 */
router.get('/vouchers/:id', getVoucherDetailsApi);

/**
 * @route PUT /admin/vouchers/:id
 * @description Update voucher
 * @access Admin only
 */
router.put('/vouchers/:id', updateVoucherApi);

/**
 * @route DELETE /admin/vouchers/:id
 * @description Delete voucher and QR code
 * @access Admin only
 */
router.delete('/vouchers/:id', deleteVoucherApi);

/**
 * @route PATCH /admin/vouchers/:id/toggle
 * @description Toggle voucher active/inactive status
 * @access Admin only
 */
router.patch('/vouchers/:id/toggle', toggleVoucherApi);

/**
 * @route GET /admin/vouchers/:id/redemptions
 * @description Get voucher redemption history
 * @query page, limit
 * @access Admin only
 */
router.get('/vouchers/:id/redemptions', getVoucherRedemptionsApi);

/**
 * @route GET /admin/vouchers/:id/qr
 * @description Download voucher QR code as PNG
 * @access Admin only
 */
router.get('/vouchers/:id/qr', downloadVoucherQRApi);

export default router;
