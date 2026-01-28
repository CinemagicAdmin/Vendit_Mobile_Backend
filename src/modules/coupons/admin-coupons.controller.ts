import type { Request, Response } from 'express';
import { auditLog } from '../../utils/audit.js';
import {
  createCouponSchema,
  updateCouponSchema,
  listCouponsQuerySchema
} from './coupons.validators.js';
import {
  createCouponService,
  listCouponsService,
  getCouponDetailsService,
  updateCouponService,
  deleteCouponService,
  deactivateCouponService,
  getCouponUsageHistoryService
} from './coupons.service.js';

/**
 * Create a new coupon (admin only)
 * POST /admin/coupons
 */
export const createCouponApi = async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const adminId = admin?.adminId || admin?.id;
  
  // Validate input
  const validation = createCouponSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.issues
    });
  }
  
  const result = await createCouponService(validation.data, adminId);
  
  // Audit log
  await auditLog({
    action: 'coupon.create',
    resourceType: 'discount_coupon',
    resourceId: result.data.id,
    adminId,
    details: {
      code: result.data.code,
      discountType: result.data.discount_type,
      discountValue: result.data.discount_value,
      adminName: admin?.name || admin?.email
    }
  }, req);
  
  return res.status(201).json(result);
};

/**
 * List all coupons with pagination and filters (admin only)
 * GET /admin/coupons?page=1&limit=20&status=active&search=WELCOME
 */
export const listCouponsApi = async (req: Request, res: Response) => {
  // Validate query parameters
  const validation = listCouponsQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: validation.error.issues
    });
  }
  
  const result = await listCouponsService(validation.data);
  
  return res.json(result);
};

/**
 * Get coupon details and statistics (admin only)
 * GET /admin/coupons/:id
 */
export const getCouponDetailsApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await getCouponDetailsService(id);
  
  return res.json(result);
};

/**
 * Update a coupon (admin only)
 * PUT /admin/coupons/:id
 */
export const updateCouponApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = (req as any).admin;
  const adminId = admin?.adminId || admin?.id;
  
  // Validate input
  const validation = updateCouponSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.issues
    });
  }
  
  const result = await updateCouponService(id, validation.data);
  
  // Audit log
  await auditLog({
    action: 'coupon.update',
    resourceType: 'discount_coupon',
    resourceId: id,
    adminId,
    details: {
      code: result.data.code,
      updates: Object.keys(validation.data),
      adminName: admin?.name || admin?.email
    }
  }, req);
  
  return res.json(result);
};

/**
 * Delete a coupon (admin only)
 * DELETE /admin/coupons/:id
 */
export const deleteCouponApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = (req as any).admin;
  const adminId = admin?.adminId || admin?.id;
  
  // Get coupon details before deletion for audit log
  const couponDetails = await getCouponDetailsService(id);
  
  const result = await deleteCouponService(id);
  
  // Audit log
  await auditLog({
    action: 'coupon.delete',
    resourceType: 'discount_coupon',
    resourceId: id,
    adminId,
    details: {
      code: couponDetails.data.coupon.code,
      adminName: admin?.name || admin?.email
    }
  }, req);
  
  return res.json(result);
};

/**
 * Deactivate a coupon (admin only)
 * PATCH /admin/coupons/:id/deactivate
 */
export const deactivateCouponApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = (req as any).admin;
  const adminId = admin?.adminId || admin?.id;
  
  const result = await deactivateCouponService(id);
  
  // Audit log
  await auditLog({
    action: 'coupon.deactivate',
    resourceType: 'discount_coupon',
    resourceId: id,
    adminId,
    details: {
      code: result.data.code,
      adminName: admin?.name || admin?.email
    }
  }, req);
  
  return res.json(result);
};

/**
 * Get coupon usage history (admin only)
 * GET /admin/coupons/:id/usage
 */
export const getCouponUsageHistoryApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = req.query;
  
  const result = await getCouponUsageHistoryService(id, {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined
  });
  
  return res.json(result);
};
