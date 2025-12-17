import { Request, Response } from 'express';
import { getCacheStats } from '../libs/cache.js';
import { ok } from '../utils/response.js';

/**
 * Get cache statistics
 * @route GET /api/admin/cache/stats
 */
export const handleCacheStats = async (_req: Request, res: Response) => {
  const stats = await getCacheStats();
  return res.json(ok(stats, 'Cache statistics'));
};

/**
 * Clear all cache
 * @route POST /api/admin/cache/clear
 */
export const handleCacheClear = async (_req: Request, res: Response) => {
  try {
    const { redis } = await import('../libs/redis.js');
    await redis.flushdb();
    return res.json(ok(null, 'Cache cleared successfully'));
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Failed to clear cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
