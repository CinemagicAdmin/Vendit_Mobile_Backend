import { supabase } from '../../../libs/supabase.js';
import {
  getPaginationParams,
  createPaginatedResult,
  type PaginationParams
} from '../../../utils/query/pagination.js';

export interface ListProductsParams extends PaginationParams {
  search?: string;
}

/**
 * Get product details by product UID
 */
export const getProduct = async (productUId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      product_u_id, brand_name, description,
      product_image_url, product_detail_image_url,
      unit_price, cost_price, metadata,
      category:category_id(category_name)
    `)
    .eq('product_u_id', productUId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

/**
 * List products with pagination
 */
export const listProducts = async (params?: ListProductsParams) => {
  const { page, limit, offset } = getPaginationParams(params);

  let query = supabase.from('machine_slots').select(`
    product:product_u_id(
      product_u_id, description, product_image_url, brand_name
    ),
    quantity, machine_u_id
  `, { count: 'exact' });

  // Apply search
  if (params?.search) {
    query = query.or(`product_u_id.ilike.%${params.search}%`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data, count, page, limit);
};
