/**
 * Filtering utilities for database queries
 */

/**
 * Apply search filter across multiple fields
 */
export const applySearch = (
  query: any,
  search: string | undefined,
  fields: string[]
): any => {
  if (!search) return query;
  const searchPattern = fields.map(field => `${field}.ilike.%${search}%`).join(',');
  return query.or(searchPattern);
};

/**
 * Apply status filter
 */
export const applyStatusFilter = (
  query: any,
  status: number | string | undefined,
  field: string = 'status'
): any => {
  if (status === undefined) return query;
  return query.eq(field, status);
};

/**
 * Apply date range filter
 */
export const applyDateRange = (
  query: any,
  startDate?: string,
  endDate?: string,
  field: string = 'created_at'
): any => {
  if (startDate) {
    query = query.gte(field, startDate);
  }
  if (endDate) {
    query = query.lte(field, endDate);
  }
  return query;
};

/**
 * Apply ordering
 */
export const applyOrdering = (
  query: any,
  orderBy: string = 'created_at',
  ascending: boolean = false
): any => {
  return query.order(orderBy, { ascending });
};
