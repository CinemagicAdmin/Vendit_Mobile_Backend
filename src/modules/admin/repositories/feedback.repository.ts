import { supabase } from '../../../libs/supabase.js';
import {
  getPaginationParams,
  createPaginatedResult,
  type PaginationParams
} from '../../../utils/query/pagination.js';
import { applySearch } from '../../../utils/query/filtering.js';

export interface ListFeedbackParams extends PaginationParams {
  search?: string;
}

/**
 * List feedback/contact messages with pagination
 */
export const listFeedback = async (params?: ListFeedbackParams) => {
  const { page, limit, offset } = getPaginationParams(params);

  let query = supabase.from('contact_us').select(`
    id, subject, message, created_at,
    user:users!contact_us_user_id_fkey(phone_number, email)
  `, { count: 'exact' });

  // Apply search
  query = applySearch(query, params?.search, ['message', 'subject']);

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data, count, page, limit);
};
