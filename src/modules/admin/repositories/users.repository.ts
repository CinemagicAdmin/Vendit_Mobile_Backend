import { supabase } from '../../../libs/supabase.js';
import {
  getPaginationParams,
  createPaginatedResult,
  type PaginationParams
} from '../../../utils/query/pagination.js';
import { applySearch, applyStatusFilter } from '../../../utils/query/filtering.js';

export interface ListUsersParams extends PaginationParams {
  status?: number;
  search?: string;
}

/**
 * List users with pagination and filters
 */
export const listUsers = async (params?: ListUsersParams) => {
  const { page, limit, offset } = getPaginationParams(params);

  let query = supabase.from('users').select(
    `id, first_name, last_name, email, phone_number, user_profile,
     country, dob, is_otp_verify, status, created_at`,
    { count: 'exact' }
  );

  // Apply filters
  query = applyStatusFilter(query, params?.status);
  query = applySearch(query, params?.search, ['first_name', 'last_name', 'email', 'phone_number']);

  // Apply pagination and sorting
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data, count, page, limit);
};

/**
 * Remove a user (with referral cleanup)
 */
export const removeUser = async (userId: string) => {
  // First, update any users who have this user as their referrer
  await supabase.from('users').update({ referrer_user_id: null }).eq('referrer_user_id', userId);

  // Now delete the user
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
};

/**
 * Set user status (active/inactive)
 */
export const setUserStatus = async (userId: string, status: number) => {
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) throw error;
};

/**
 * Get user profile with wallet and loyalty data
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, first_name, last_name, email, phone_number, user_profile,
      country, dob, is_otp_verify, status, created_at,
      wallet:wallet(balance),
      loyalty:user_loyalty_points(points_balance)
    `)
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

/**
 * Get user payment history
 */
export const getUserPayments = async (userId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, charge_id, amount, created_at, transaction_id,
      machine:machine_u_id(machine_tag, location_address)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
};
