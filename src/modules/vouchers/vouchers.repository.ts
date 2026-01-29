import { supabase } from '../../libs/supabase.js';

// Type definitions
interface VoucherCreateData {
  code: string;
  description?: string | null;
  amount: number;
  qrCodeUrl?: string | null;
  maxUsesPerUser?: number;
  maxTotalUses?: number | null;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  createdByAdminId?: string | null;
}

interface VoucherUpdateData {
  code?: string;
  description?: string | null;
  amount?: number;
  qrCodeUrl?: string;
  maxUsesPerUser?: number;
  maxTotalUses?: number | null;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

interface RedemptionData {
  voucherId: string;
  userId: string;
  walletTransactionId?: string | null;
  amountCredited: number;
}

interface ListFilters {
  search?: string;
  status?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Create a new voucher
 */
export const createVoucher = async (data: VoucherCreateData) => {
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert({
      code: data.code,
      description: data.description ?? null,
      amount: data.amount,
      qr_code_url: data.qrCodeUrl ?? null,
      max_uses_per_user: data.maxUsesPerUser ?? 1,
      max_total_uses: data.maxTotalUses ?? null,
      valid_from: data.validFrom,
      valid_until: data.validUntil,
      is_active: data.isActive ?? true,
      created_by_admin_id: data.createdByAdminId ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return voucher;
};

/**
 * Get voucher by ID
 */
export const getVoucherById = async (id: string) => {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get voucher by code (case-insensitive)
 */
export const getVoucherByCode = async (code: string) => {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .ilike('code', code)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
};

/**
 * List vouchers with filters and pagination
 */
export const listVouchers = async (
  filters: ListFilters = {},
  pagination: PaginationParams = {}
) => {
  const { search, status } = filters;
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('vouchers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Search by code
  if (search) {
    query = query.ilike('code', `%${search}%`);
  }

  // Filter by status
  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    vouchers: data ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};

/**
 * Update voucher
 */
export const updateVoucher = async (id: string, data: VoucherUpdateData) => {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.qrCodeUrl !== undefined) updateData.qr_code_url = data.qrCodeUrl;
  if (data.maxUsesPerUser !== undefined) updateData.max_uses_per_user = data.maxUsesPerUser;
  if (data.maxTotalUses !== undefined) updateData.max_total_uses = data.maxTotalUses;
  if (data.validFrom !== undefined) updateData.valid_from = data.validFrom;
  if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return voucher;
};

/**
 * Delete voucher
 */
export const deleteVoucher = async (id: string) => {
  const { error } = await supabase
    .from('vouchers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * Toggle voucher active status
 */
export const toggleVoucherStatus = async (id: string) => {
  // Get current status
  const voucher = await getVoucherById(id);
  
  // Toggle it
  const { data, error } = await supabase
    .from('vouchers')
    .update({
      is_active: !voucher.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update voucher QR code URL
 */
export const updateVoucherQRUrl = async (id: string, url: string) => {
  const { data, error } = await supabase
    .from('vouchers')
    .update({
      qr_code_url: url,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Atomically increment voucher usage count
 */
export const incrementVoucherUsage = async (voucherId: string, maxUses: number | null) => {
  const { data, error } = await supabase.rpc('increment_voucher_usage', {
    p_voucher_id: voucherId,
    p_max_uses: maxUses
  });

  if (error) throw error;
  return data; // Returns true if incremented, false if limit reached
};

/**
 * Create voucher redemption record
 */
export const createRedemption = async (data: RedemptionData) => {
  const { data: redemption, error } = await supabase
    .from('voucher_redemptions')
    .insert({
      voucher_id: data.voucherId,
      user_id: data.userId,
      wallet_transaction_id: data.walletTransactionId ?? null,
      amount_credited: data.amountCredited
    })
    .select()
    .single();

  if (error) throw error;
  return redemption;
};

/**
 * Get user's redemption count for a voucher
 */
export const getUserRedemptionCount = async (voucherId: string, userId: string) => {
  const { count, error } = await supabase
    .from('voucher_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('voucher_id', voucherId)
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
};

/**
 * Get voucher redemptions with user info
 */
export const getVoucherRedemptions = async (
  voucherId: string,
  pagination: PaginationParams = {}
) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('voucher_redemptions')
    .select(`
      id,
      amount_credited,
      redeemed_at,
      user_id,
      users (
        first_name,
        last_name,
        phone_number
      )
    `, { count: 'exact' })
    .eq('voucher_id', voucherId)
    .order('redeemed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Transform data to flatten user info
  const redemptions = (data ?? []).map((r: any) => ({
    id: r.id,
    user_name: r.users ? `${r.users.first_name ?? ''} ${r.users.last_name ?? ''}`.trim() : null,
    user_phone: r.users?.phone_number ?? null,
    amount_credited: r.amount_credited,
    redeemed_at: r.redeemed_at
  }));

  return {
    redemptions,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};

/**
 * Get voucher statistics
 */
export const getVoucherStats = async (voucherId: string) => {
  const { data, error } = await supabase
    .from('voucher_redemptions')
    .select('amount_credited, user_id')
    .eq('voucher_id', voucherId);

  if (error) throw error;

  const redemptions = data ?? [];
  const totalRedemptions = redemptions.length;
  const uniqueUsers = new Set(redemptions.map((r: any) => r.user_id)).size;
  const totalAmountCredited = redemptions.reduce((sum: number, r: any) => sum + parseFloat(r.amount_credited), 0);
  const averageAmount = totalRedemptions > 0 ? totalAmountCredited / totalRedemptions : 0;

  return {
    totalRedemptions,
    uniqueUsers,
    totalAmountCredited,
    averageAmount
  };
};

/**
 * Get user's redemption history
 */
export const getUserRedemptionHistory = async (
  userId: string,
  pagination: PaginationParams = {}
) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('voucher_redemptions')
    .select(`
      id,
      amount_credited,
      redeemed_at,
      vouchers (
        code,
        description
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Transform data
  const history = (data ?? []).map((r: any) => ({
    id: r.id,
    voucher_code: r.vouchers?.code ?? null,
    voucher_description: r.vouchers?.description ?? null,
    amount_credited: r.amount_credited,
    redeemed_at: r.redeemed_at
  }));

  return {
    history,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};
