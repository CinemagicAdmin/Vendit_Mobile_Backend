import { vi } from 'vitest';

/**
 * Mock Supabase client for testing
 * Provides chainable query builder methods
 */
export const createMockSupabaseClient = () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null })
  };

  return {
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: { user: {} }, error: null })
      },
      signUp: vi.fn().mockResolvedValue({ data: { user: {}, session: {} }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user' }, session: {} },
        error: null 
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null })
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  };
};
