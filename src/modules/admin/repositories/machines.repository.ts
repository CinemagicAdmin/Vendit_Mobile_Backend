import { supabase } from '../../../libs/supabase.js';
import {
  getPaginationParams,
  createPaginatedResult,
  type PaginationParams
} from '../../../utils/query/pagination.js';
import { applySearch } from '../../../utils/query/filtering.js';

export interface ListMachinesParams extends PaginationParams {
  status?: string;
  search?: string;
}

/**
 * List machines with pagination and filters
 */
export const listMachines = async (params?: ListMachinesParams) => {
  const { page, limit, offset } = getPaginationParams(params);

  let query = supabase.from('machines').select(
    `u_id, machine_tag, location_address, machine_image_url,
     machine_operation_state, last_machine_status, machine_qrcode, created_at`,
    { count: 'exact' }
  );

  // Apply filters
  if (params?.status) {
    query = query.eq('machine_operation_state', params.status);
  }

  query = applySearch(query, params?.search, ['machine_tag', 'u_id', 'location_address']);

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data, count, page, limit);
};

/**
 * List products in a specific machine
 */
export const listMachineProducts = async (machineUId: string) => {
  const { data, error } = await supabase
    .from('machine_slots')
    .select(`
      slot_number, quantity, max_quantity,
      product:product_u_id(
        product_u_id, description, product_image_url,
        brand_name, category:category_id(category_name)
      )
    `)
    .eq('machine_u_id', machineUId);
  
  if (error) throw error;
  return data ?? [];
};
