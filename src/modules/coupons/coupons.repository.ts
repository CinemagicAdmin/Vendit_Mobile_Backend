import { supabase } from '../../libs/supabase.js';
import { logger } from '../../config/logger.js';

// =====================================================
// COUPON CRUD OPERATIONS
// =====================================================

/**
 * Get coupon by code (case-insensitive)
 */
export const getCouponByCode = async (code: string) => {
  logger.info({ code }, 'Getting coupon by code');
  
  const { data, error } = await supabase
    .from('discount_coupons')
    .select('*')
    .ilike('code', code)
    .maybeSingle();
  
  if (error) {
    logger.error({ error, code }, 'Failed to get coupon by code');
    throw error;
  }
  
  return data;
};

/**
 * Get coupon by ID
 */
export const getCouponById = async (id: string) => {
  logger.info({ id }, 'Getting coupon by ID');
  
  const { data, error } = await supabase
    .from('discount_coupons')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    logger.error({ error, id }, 'Failed to get coupon by ID');
    throw error;
  }
  
  return data;
};

/**
 * List coupons with pagination and filters
 */
export const listCoupons = async (options: {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;
  
  logger.info({ options }, 'Listing coupons');
  
  let query = supabase.from('discount_coupons').select('*', { count: 'exact' });
  
  // Filter by status
  if (options.status === 'active') {
    const now = new Date().toISOString();
    query = query
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now);
  } else if (options.status === 'inactive') {
    query = query.eq('is_active', false);
  }
  
  // Search by code or description
  if (options.search) {
    query = query.or(`code.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  
  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    logger.error({ error, options }, 'Failed to list coupons');
    throw error;
  }
  
  return {
    coupons: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 0
    }
  };
};

/**
 * Create a new coupon
 */
export const createCoupon = async (payload: {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  maxUsesPerUser?: number;
  maxTotalUses?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  createdByAdminId?: string;
  metadata?: any;
}) => {
  logger.info({ code: payload.code }, 'Creating coupon');
  
  const { data, error } = await supabase
    .from('discount_coupons')
    .insert({
      code: payload.code.toUpperCase().trim(),
      description: payload.description || null,
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      min_purchase_amount: payload.minPurchaseAmount || 0,
      max_discount_amount: payload.maxDiscountAmount || null,
      max_uses_per_user: payload.maxUsesPerUser || 1,
      max_total_uses: payload.maxTotalUses || null,
      valid_from: payload.validFrom,
      valid_until: payload.validUntil,
      is_active: payload.isActive !== undefined ? payload.isActive : true,
      created_by_admin_id: payload.createdByAdminId || null,
      metadata: payload.metadata || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    logger.error({ error, code: payload.code }, 'Failed to create coupon');
    throw error;
  }
  
  logger.info({ couponId: data.id, code: data.code }, 'Coupon created successfully');
  return data;
};

/**
 * Update an existing coupon
 */
export const updateCoupon = async (id: string, payload: Partial<{
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  maxUsesPerUser: number;
  maxTotalUses: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  metadata: any;
}>) => {
  logger.info({ id, updates: Object.keys(payload) }, 'Updating coupon');
  
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (payload.code !== undefined) updateData.code = payload.code.toUpperCase().trim();
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.discountType !== undefined) updateData.discount_type = payload.discountType;
  if (payload.discountValue !== undefined) updateData.discount_value = payload.discountValue;
  if (payload.minPurchaseAmount !== undefined) updateData.min_purchase_amount = payload.minPurchaseAmount;
  if (payload.maxDiscountAmount !== undefined) updateData.max_discount_amount = payload.maxDiscountAmount;
  if (payload.maxUsesPerUser !== undefined) updateData.max_uses_per_user = payload.maxUsesPerUser;
  if (payload.maxTotalUses !== undefined) updateData.max_total_uses = payload.maxTotalUses;
  if (payload.validFrom !== undefined) updateData.valid_from = payload.validFrom;
  if (payload.validUntil !== undefined) updateData.valid_until = payload.validUntil;
  if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
  if (payload.metadata !== undefined) updateData.metadata = payload.metadata;
  
  const { data, error } = await supabase
    .from('discount_coupons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error({ error, id }, 'Failed to update coupon');
    throw error;
  }
  
  logger.info({ couponId: id }, 'Coupon updated successfully');
  return data;
};

/**
 * Delete a coupon
 */
export const deleteCoupon = async (id: string) => {
  logger.info({ id }, 'Deleting coupon');
  
  const { error } = await supabase
    .from('discount_coupons')
    .delete()
    .eq('id', id);
  
  if (error) {
    logger.error({ error, id }, 'Failed to delete coupon');
    throw error;
  }
  
  logger.info({ id }, 'Coupon deleted successfully');
};

/**
 * Deactivate a coupon
 */
export const deactivateCoupon = async (id: string) => {
  logger.info({ id }, 'Deactivating coupon');
  
  const { data, error } = await supabase
    .from('discount_coupons')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error({ error, id }, 'Failed to deactivate coupon');
    throw error;
  }
  
  logger.info({ id }, 'Coupon deactivated successfully');
  return data;
};

// =====================================================
// USAGE TRACKING
// =====================================================

/**
 * Get coupon usage count for a specific user
 */
export const getCouponUsageCount = async (couponId: string, userId: string): Promise<number> => {
  logger.info({ couponId, userId }, 'Getting coupon usage count');
  
  const { count, error } = await supabase
    .from('coupon_usage')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', couponId)
    .eq('user_id', userId);
  
  if (error) {
    logger.error({ error, couponId, userId }, 'Failed to get usage count');
    throw error;
  }
  
  return count ?? 0;
};

/**
 * Record coupon usage
 */
export const recordCouponUsage = async (payload: {
  couponId: string;
  userId: string;
  paymentId: string | null;
  discountApplied: number;
  originalAmount: number;
  finalAmount: number;
}) => {
  logger.info({ 
    couponId: payload.couponId, 
    userId: payload.userId,
    discountApplied: payload.discountApplied
  }, 'Recording coupon usage');
  
  const { data, error } = await supabase
    .from('coupon_usage')
    .insert({
      coupon_id: payload.couponId,
      user_id: payload.userId,
      payment_id: payload.paymentId,
      discount_applied: payload.discountApplied,
      original_amount: payload.originalAmount,
      final_amount: payload.finalAmount,
      used_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    logger.error({ error, payload }, 'Failed to record coupon usage');
    throw error;
  }
  
  logger.info({ usageId: data.id, couponId: payload.couponId }, 'Coupon usage recorded');
  return data;
};

/**
 * Atomically increment coupon usage count
 * Uses database function to prevent race conditions
 */
export const incrementCouponUsage = async (couponId: string, maxTotalUses: number | null): Promise<boolean> => {
  logger.info({ couponId, maxTotalUses }, 'Incrementing coupon usage');
  
  const { data, error } = await supabase.rpc('increment_coupon_usage', {
    p_coupon_id: couponId,
    p_max_total_uses: maxTotalUses
  });
  
  if (error) {
    logger.error({ error, couponId }, 'Failed to increment coupon usage');
    throw error;
  }
  
  return data as boolean;
};

/**
 * Get coupon usage statistics
 */
export const getCouponStats = async (couponId: string) => {
  logger.info({ couponId }, 'Getting coupon statistics');
  
  const { data, error } = await supabase
    .from('coupon_usage')
    .select('discount_applied, user_id')
    .eq('coupon_id', couponId);
  
  if (error) {
    logger.error({ error, couponId }, 'Failed to get coupon stats');
    throw error;
  }
  
  const totalUses = data.length;
  const totalDiscountGiven = data.reduce((sum, usage) => sum + Number(usage.discount_applied), 0);
  const uniqueUsers = new Set(data.map(u => u.user_id)).size;
  
  return {
    totalUses,
    totalDiscountGiven,
    uniqueUsers
  };
};

/**
 * List coupon usage history
 */
export const listCouponUsageHistory = async (couponId: string, options: {
  page?: number;
  limit?: number;
} = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;
  
  logger.info({ couponId, page, limit }, 'Listing coupon usage history');
  
  const { data, error, count } = await supabase
    .from('coupon_usage')
    .select(`
      *,
      user:users!inner(id, first_name, last_name, email, phone_number)
    `, { count: 'exact' })
    .eq('coupon_id', couponId)
    .order('used_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    logger.error({ error, couponId }, 'Failed to list usage history');
    throw error;
  }
  
  return {
    usages: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 0
    }
  };
};

/**
 * List available coupons for a specific user (optimized)
 * Uses a single SQL query to avoid N+1 problem
 */
export const listAvailableCoupons = async (userId: string, limit: number = 20) => {
  logger.info({ userId, limit }, 'Listing available coupons for user');
  
  const now = new Date().toISOString();
  
  // Get active coupons with user usage count in single query
  const { data, error } = await supabase
    .from('discount_coupons')
    .select(`
      id,
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_uses_per_user,
      valid_until,
      coupon_usage!left (
        user_id
      )
    `)
    .eq('is_active', true)
    .lte('valid_from', now)
    .gte('valid_until', now)
    .limit(limit);
  
  if (error) {
    logger.error({ error, userId }, 'Failed to list available coupons');
    throw error;
  }
  
  // Filter and transform results
  const availableCoupons = (data ?? [])
    .map(coupon => {
      // Count how many times this user has used this coupon
      const userUsageCount = (coupon.coupon_usage || [])
        .filter((usage: any) => usage.user_id === userId)
        .length;
      
      const maxUsesPerUser = coupon.max_uses_per_user || 1;
      const remainingUses = maxUsesPerUser - userUsageCount;
      
      return {
        coupon,
        userUsageCount,
        maxUsesPerUser,
        remainingUses
      };
    })
    .filter(item => item.remainingUses > 0)
    .map(item => ({
      code: item.coupon.code,
      description: item.coupon.description,
      discountType: item.coupon.discount_type,
      discountValue: item.coupon.discount_value,
      minPurchaseAmount: item.coupon.min_purchase_amount,
      validUntil: item.coupon.valid_until,
      remainingUses: item.remainingUses
    }));
  
  return availableCoupons;
};

