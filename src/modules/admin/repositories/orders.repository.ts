import { supabase } from '../../../libs/supabase.js';
import {
  getPaginationParams,
  createPaginatedResult,
  type PaginationParams
} from '../../../utils/query/pagination.js';
import { applyStatusFilter } from '../../../utils/query/filtering.js';

export interface ListOrdersParams extends PaginationParams {
  status?: string;
  search?: string;
  userId?: string;
}

/**
 * List orders with pagination and filters
 */
export const listOrders = async (params?: ListOrdersParams) => {
  const { page, limit, offset } = getPaginationParams(params);

  let query = supabase.from('payments').select(`
    id, order_reference, amount, payment_method, status, created_at, transaction_id,
    machine:machine_u_id(machine_tag, location_address),
    user:users!payments_user_id_fkey(first_name, last_name, email, phone_number)
  `, { count: 'exact' });

  // Apply filters
  query = applyStatusFilter(query, params?.status);
  
  // Filter by user if specified
  if (params?.userId) {
    query = query.eq('user_id', params.userId);
  }
  
  if (params?.search) {
    query = query.or(`order_reference.ilike.%${params.search}%,transaction_id.ilike.%${params.search}%`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data, count, page, limit);
};

/**
 * Get order details by ID
 */
export const getOrder = async (orderId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, order_reference, amount, payment_method, status, created_at,
      charge_id, transaction_id, currency, earned_points, redeemed_points,
      redeemed_amount, user_id,
      machine:machine_u_id(machine_tag, machine_image_url, location_address, u_id),
      user:users!payments_user_id_fkey(first_name, last_name, email, phone_number, user_profile)
    `)
    .eq('id', orderId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

/**
 * List products in an order
 */
export const listOrderProducts = async (orderId: string) => {
  const { data, error } = await supabase
    .from('payment_products')
    .select(`
      quantity, dispensed_quantity,
      product:product_u_id(product_u_id, description, product_image_url, cost_price)
    `)
    .eq('payment_id', orderId);
  
  if (error) throw error;
  return data ?? [];
};
