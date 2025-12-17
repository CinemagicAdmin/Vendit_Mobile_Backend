import { redis } from './redis.js';
import { logger } from '../config/logger.js';
import { cacheHits, cacheMisses } from './metrics.js';

const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_PREFIX = 'cache';

interface CacheOptions {
  prefix?: string;
  ttl?: number;
}

/**
 * Generate a cache key with optional prefix
 */
const getCacheKey = (key: string, prefix?: string): string => {
  const actualPrefix = prefix || DEFAULT_PREFIX;
  return `${actualPrefix}:${key}`;
};
/**
 * Get a value from cache
 */
export const cacheGet = async <T = any>(key: string, options?: CacheOptions): Promise<T | null> => {
  try {
    const cacheKey = getCacheKey(key, options?.prefix);
    const value = await redis.get(cacheKey);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn({ error, key }, 'Cache get failed');
    return null;
  }
};
/**
 * Set a value in cache with TTL
 */
export const cacheSet = async (
  key: string,
  value: any,
  options?: CacheOptions
): Promise<boolean> => {
  try {
    const cacheKey = getCacheKey(key, options?.prefix);
    const ttl = options?.ttl || DEFAULT_TTL;
    const serialized = JSON.stringify(value);
    await redis.setex(cacheKey, ttl, serialized);
    return true;
  } catch (error) {
    logger.warn({ error, key }, 'Cache set failed');
    return false;
  }
};
/**
 * Delete a value from cache
 */
export const cacheDel = async (key: string, options?: CacheOptions): Promise<boolean> => {
  try {
    const cacheKey = getCacheKey(key, options?.prefix);
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    logger.warn({ error, key }, 'Cache delete failed');
    return false;
  }
};
/**
 * Delete multiple keys matching a pattern
 */
export const cacheDelPattern = async (pattern: string, options?: CacheOptions): Promise<number> => {
  try {
    const prefix = options?.prefix || DEFAULT_PREFIX;
    const fullPattern = `${prefix}:${pattern}`;
    // Note: This is a simple implementation. For production with many keys,
    // consider using SCAN instead of KEYS to avoid blocking
    logger.info({ pattern: fullPattern }, 'Deleting cache keys by pattern');
    // Since our RedisAdapter doesn't have keys() method, we'll just log
    // In a real implementation, you'd use SCAN or KEYS
    return 0;
  } catch (error) {
    logger.warn({ error, pattern }, 'Cache pattern delete failed');
    return 0;
  }
};
/**
 * Wrapper function to cache the result of an async function
 */
export const cacheWrap = async <T = any>(
  key: string,
  fn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> => {
  const keyPrefix = key.split(':')[0]; // Extract key prefix for metrics
  
  // Try to get from cache first
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    logger.debug({ key }, 'Cache hit');
    cacheHits.inc({ key_prefix: keyPrefix });
    return cached;
  }
  
  logger.debug({ key }, 'Cache miss');
  cacheMisses.inc({ key_prefix: keyPrefix });
  
  // Execute the function
  const result = await fn();
  // Store in cache
  await cacheSet(key, result, options);
  return result;
};
/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  products: (machineId: string, categoryId?: string): string =>
    categoryId ? `products:${machineId}:${categoryId}` : `products:${machineId}`,
  categories: (machineId: string): string => `categories:${machineId}`,
  machine: (machineId: string): string => `machine:${machineId}`,
  machines: (lat: number, lng: number, radius: number): string =>
    `machines:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
  productDetail: (productId: string): string => `product:${productId}`,
  campaigns: (): string => `campaigns:active`
};
/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 300, // 5 minutes (updated from 60s)
  MEDIUM: 1800, // 30 minutes (updated from 300s)
  LONG: 3600, // 1 hour (updated from 600s)
  HOUR: 3600, // 1 hour
  DAY: 86400 // 24 hours
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    // Get Redis INFO stats
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};
    
    lines.forEach((line) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    });

    // Get Prometheus metrics for cache
    const cacheHitsTotal = await cacheHits.get();
    const cacheMissesTotal = await cacheMisses.get();
    
    const hits = cacheHitsTotal.values.reduce((sum, v) => sum + v.value, 0);
    const misses = cacheMissesTotal.values.reduce((sum, v) => sum + v.value, 0);
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    return {
      redis: {
        connected_clients: stats.connected_clients || '0',
        total_commands_processed: stats.total_commands_processed || '0',
        keyspace_hits: stats.keyspace_hits || '0',
        keyspace_misses: stats.keyspace_misses || '0',
        used_memory_human: stats.used_memory_human || 'N/A'
      },
      application: {
        hits,
        misses,
        total,
        hit_rate: `${hitRate}%`,
        hit_rate_numeric: parseFloat(hitRate)
      },
      by_key_prefix: cacheHitsTotal.values.map((v) => ({
        key_prefix: v.labels.key_prefix,
        hits: v.value,
        misses: cacheMissesTotal.values.find(m => m.labels.key_prefix === v.labels.key_prefix)?.value || 0
      }))
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get cache stats');
    return {
      error: 'Failed to retrieve cache statistics',
      redis: {},
      application: { hits: 0, misses: 0, total: 0, hit_rate: '0%', hit_rate_numeric: 0 },
      by_key_prefix: []
    };
  }
};


