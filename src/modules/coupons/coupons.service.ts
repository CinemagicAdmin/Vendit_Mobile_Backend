import { apiError, ok } from '../../utils/response.js';
import { logger } from '../../config/logger.js';
import {
  getCouponByCode,
  getCouponById,
  getCouponUsageCount,
  getCouponStats,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  deactivateCoupon,
  recordCouponUsage,
  incrementCouponUsage,
  listCouponUsageHistory,
  listAvailableCoupons
} from './coupons.repository.js';
import type { CreateCouponInput, UpdateCouponInput, ValidateCouponInput } from './coupons.validators.js';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CouponValidation {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
  error?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const roundKwd = (amount: number): number => {
  return Math.max(Math.round(amount * 1000) / 1000, 0);
};

// =====================================================
// COUPON VALIDATION LOGIC
// =====================================================

/**
 * Validate a coupon code and calculate discount
 */
export const validateCoupon = async (
  userId: string,
  code: string,
  cartAmount: number
): Promise<CouponValidation> => {
  logger.info({ userId, code, cartAmount }, 'Validating coupon');
  
  // 1. Get coupon by code (case-insensitive)
  const coupon = await getCouponByCode(code.toUpperCase().trim());
  if (!coupon) {
    logger.warn({ code }, 'Coupon not found');
    return { valid: false, error: 'Coupon not found' };
  }
  
  // 2. Check if active
  if (!coupon.is_active) {
    logger.warn({ code, couponId: coupon.id }, 'Coupon is inactive');
    return { valid: false, error: 'Coupon is inactive' };
  }
  
  // 3. Check validity period
  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  const validUntil = new Date(coupon.valid_until);
  
  if (now < validFrom) {
    logger.warn({ code, validFrom }, 'Coupon not yet valid');
    return { 
      valid: false, 
      error: `Coupon is not yet valid. Starts on ${validFrom.toLocaleDateString()}` 
    };
  }
  
  if (now > validUntil) {
    logger.warn({ code, validUntil }, 'Coupon has expired');
    return { 
      valid: false, 
      error: 'Coupon has expired' 
    };
  }
  
  // 4. Check minimum purchase amount
  const minPurchase = coupon.min_purchase_amount || 0;
  if (cartAmount < minPurchase) {
    logger.warn({ code, cartAmount, minPurchase }, 'Below minimum purchase amount');
    return { 
      valid: false, 
      error: `Minimum purchase of KWD ${minPurchase.toFixed(3)} required` 
    };
  }
  
  // 5. Check total usage limit
  if (coupon.max_total_uses && coupon.current_total_uses >= coupon.max_total_uses) {
    logger.warn({ code, currentUses: coupon.current_total_uses, maxUses: coupon.max_total_uses }, 
      'Coupon usage limit reached');
    return { valid: false, error: 'Coupon usage limit reached' };
  }
  
  // 6. Check user-specific usage limit
  const userUsageCount = await getCouponUsageCount(coupon.id, userId);
  const maxUsesPerUser = coupon.max_uses_per_user || 1;
  
  if (userUsageCount >= maxUsesPerUser) {
    logger.warn({ code, userId, userUsageCount, maxUsesPerUser }, 'User has reached usage limit');
    return { 
      valid: false, 
      error: 'You have already used this coupon' 
    };
  }
  
  // 7. Calculate discount
  let discountAmount = 0;
  
  if (coupon.discount_type === 'PERCENTAGE') {
    // Percentage discount
    discountAmount = (cartAmount * coupon.discount_value) / 100;
    
    // Apply max cap if set
    if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
      discountAmount = coupon.max_discount_amount;
      logger.info({ code, calculatedDiscount: (cartAmount * coupon.discount_value) / 100, 
        cappedDiscount: discountAmount }, 'Applied max discount cap');
    }
  } else {
    // FIXED_AMOUNT discount
    discountAmount = Math.min(coupon.discount_value, cartAmount);
  }
  
  // Round to 3 decimals (KWD)
  discountAmount = roundKwd(discountAmount);
  const finalAmount = roundKwd(Math.max(cartAmount - discountAmount, 0));
  
  logger.info({ 
    code, 
    userId, 
    cartAmount, 
    discountAmount, 
    finalAmount 
  }, 'Coupon validated successfully');
  
  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: coupon.discount_value,
    discountAmount,
    finalAmount,
    message: `Coupon applied! You save KWD ${discountAmount.toFixed(3)}`
  };
};

/**
 * Validate and calculate coupon discount with product info
 */
export const validateAndCalculateCoupon = async (
  userId: string,
  code: string,
  amount: number,
  products?: Array<{ productId: string; quantity: number }>
): Promise<CouponValidation> => {
  return validateCoupon(userId, code, amount);
};

/**
 * Apply coupon to payment (record usage and increment counter)
 */
export const applyCoupon = async (payload: {
  couponId: string;
  userId: string;
  paymentId: string;
  discountApplied: number;
  originalAmount: number;
  finalAmount: number;
  maxTotalUses: number | null;
}): Promise<void> => {
  logger.info({ couponId: payload.couponId, userId: payload.userId }, 'Applying coupon');
  
  // Atomically increment usage count
  const incremented = await incrementCouponUsage(payload.couponId, payload.maxTotalUses);
  
  if (!incremented) {
    throw new apiError(400, 'Coupon usage limit exceeded');
  }
  
  // Record usage
  await recordCouponUsage({
    couponId: payload.couponId,
    userId: payload.userId,
    paymentId: payload.paymentId,
    discountApplied: payload.discountApplied,
    originalAmount: payload.originalAmount,
    finalAmount: payload.finalAmount
  });
  
  logger.info({ couponId: payload.couponId, userId: payload.userId }, 'Coupon applied successfully');
};

// =====================================================
// ADMIN CRUD SERVICES
// =====================================================

/**
 * Create a new coupon (admin)
 */
export const createCouponService = async (
  input: CreateCouponInput,
  adminId?: string
) => {
  logger.info({ code: input.code, adminId }, 'Creating coupon');
  
  const coupon = await createCoupon({
    ...input,
    createdByAdminId: adminId
  });
  
  return ok(coupon, 'Coupon created successfully');
};

/**
 * List coupons with pagination and filters (admin)
 */
export const listCouponsService = async (options: {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}) => {
  logger.info({ options }, 'Listing coupons');
  
  const result = await listCoupons(options);
  
  return ok(result, 'Coupons retrieved successfully');
};

/**
 * Get coupon details with statistics (admin)
 */
export const getCouponDetailsService = async (id: string) => {
  logger.info({ id }, 'Getting coupon details');
  
  const coupon = await getCouponById(id);
  if (!coupon) {
    throw new apiError(404, 'Coupon not found');
  }
  
  const stats = await getCouponStats(id);
  
  return ok({ coupon, stats }, 'Coupon details retrieved');
};

/**
 * Update a coupon (admin)
 */
export const updateCouponService = async (
  id: string,
  input: UpdateCouponInput
) => {
  logger.info({ id, updates: Object.keys(input) }, 'Updating coupon');
  
  const coupon = await getCouponById(id);
  if (!coupon) {
    throw new apiError(404, 'Coupon not found');
  }
  
  const updated = await updateCoupon(id, input);
  
  return ok(updated, 'Coupon updated successfully');
};

/**
 * Delete a coupon (admin)
 */
export const deleteCouponService = async (id: string) => {
  logger.info({ id }, 'Deleting coupon');
  
  const coupon = await getCouponById(id);
  if (!coupon) {
    throw new apiError(404, 'Coupon not found');
  }
  
  await deleteCoupon(id);
  
  return ok(null, 'Coupon deleted successfully');
};

/**
 * Deactivate a coupon (admin)
 */
export const deactivateCouponService = async (id: string) => {
  logger.info({ id }, 'Deactivating coupon');
  
  const coupon = await getCouponById(id);
  if (!coupon) {
    throw new apiError(404, 'Coupon not found');
  }
  
  const updated = await deactivateCoupon(id);
  
  return ok(updated, 'Coupon deactivated successfully');
};

/**
 * Get coupon usage history (admin)
 */
export const getCouponUsageHistoryService = async (
  id: string,
  options: { page?: number; limit?: number } = {}
) => {
  logger.info({ id, options }, 'Getting coupon usage history');
  
  const coupon = await getCouponById(id);
  if (!coupon) {
    throw new apiError(404, 'Coupon not found');
  }
  
  const result = await listCouponUsageHistory(id, options);
  
  return ok(result, 'Usage history retrieved');
};

// =====================================================
// USER-SIDE SERVICES
// =====================================================

/**
 * Validate coupon endpoint (user)
 */
export const validateCouponService = async (
  userId: string,
  input: ValidateCouponInput
) => {
  logger.info({ userId, code: input.code }, 'Validating coupon for user');
  
  const result = await validateAndCalculateCoupon(
    userId,
    input.code,
    input.amount,
    input.products
  );
  
  if (result.valid) {
    return ok({
      valid: true,
      coupon: {
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
        message: result.message
      }
    }, 'Coupon is valid');
  } else {
    return ok({
      valid: false,
      error: result.error
    }, result.error || 'Coupon validation failed');
  }
};

/**
 * List available coupons for user (optimized - no N+1 queries)
 */
export const listAvailableCouponsService = async (userId: string) => {
  logger.info({ userId }, 'Listing available coupons for user');
  
  const availableCoupons = await listAvailableCoupons(userId, 20);
  
  return ok({ coupons: availableCoupons }, 'Available coupons retrieved');
};

