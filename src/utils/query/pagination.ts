/**
 * Pagination utilities for database queries
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Get pagination parameters with defaults
 */
export const getPaginationParams = (params?: PaginationParams) => {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta =>  ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});

/**
 * Create a paginated result object
 */
export const createPaginatedResult = <T>(
  data: T[] | null,
  count: number | null,
  page: number,
  limit: number
): PaginatedResult<T> => ({
  data: data ?? [],
  meta: buildPaginationMeta(page, limit, count ?? 0)
});
