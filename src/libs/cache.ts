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
 * Cache TTL constants (in seconds)
 *
 * TTL Strategy Documentation:
 * - SHORT (5min): Frequently changing data (cart items, availability)
 * - MEDIUM (30min): Semi-static data (product catalog, categories)
 * - LONG (1hr): Rarely changing data (machine locations, campaigns)
 * - DAY (24hr): Static content (terms, privacy policy)
 */
export const CacheTTL = {
  SHORT: 300, // 5 minutes - cart, real-time data
  MEDIUM: 1800, // 30 minutes - products, categories
  LONG: 3600, // 1 hour - machines, campaigns
  HOUR: 3600, // 1 hour (alias)
  DAY: 86400 // 24 hours - static content
};

/**
 * Centralized cache key manager
 * All cache keys should be generated through this namespace system
 */
export const CacheKeys = {
  // User-related keys
  user: {
    profile: (userId: string) => `user:${userId}:profile`,
    wallet: (userId: string) => `user:${userId}:wallet`,
    loyalty: (userId: string) => `user:${userId}:loyalty`,
    cards: (userId: string) => `user:${userId}:cards`,
    all: (userId: string) => `user:${userId}:*`
  },

  // Product-related keys
  products: {
    byMachine: (machineId: string) => `products:machine:${machineId}`,
    byCategory: (machineId: string, categoryId: string) =>
      `products:machine:${machineId}:category:${categoryId}`,
    detail: (productId: string) => `product:${productId}:detail`,
    inventory: (productId: string) => `product:${productId}:inventory`,
    all: (machineId: string) => `products:machine:${machineId}:*`
  },

  // Machine-related keys
  machines: {
    detail: (machineId: string) => `machine:${machineId}:detail`,
    nearby: (lat: number, lng: number, radius: number) =>
      `machines:nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
    status: (machineId: string) => `machine:${machineId}:status`,
    all: () => 'machines:*'
  },

  // Category keys
  categories: {
    byMachine: (machineId: string) => `categories:machine:${machineId}`,
    all: () => 'categories:*'
  },

  // Campaign keys
  campaigns: {
    active: () => 'campaigns:active',
    detail: (campaignId: string) => `campaign:${campaignId}:detail`,
    all: () => 'campaigns:*'
  },

  // Cart keys
  cart: {
    items: (userId: string) => `cart:${userId}:items`,
    all: (userId: string) => `cart:${userId}:*`
  },

  // Admin keys
  admin: {
    stats: () => 'admin:stats',
    charts: (period: string) => `admin:charts:${period}`,
    all: () => 'admin:*'
  }
};

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
 * Delete multiple keys matching a pattern (supports wildcards)
 *
 * Usage:
 * - invalidatePattern('user:123:*') - invalidate all user 123 data
 * - invalidatePattern('products:*') - invalidate all products
 * - invalidatePattern(CacheKeys.user.all('123')) - type-safe invalidation
 */
export const invalidatePattern = async (
  pattern: string,
  options?: CacheOptions
): Promise<number> => {
  try {
    const prefix = options?.prefix || DEFAULT_PREFIX;
    const fullPattern = `${prefix}:${pattern}`;

    logger.info({ pattern: fullPattern }, 'Invalidating cache by pattern');

    // Check if redis client has keys method (real Redis)
    if (typeof (redis as any).keys === 'function') {
      const keys = await (redis as any).keys(fullPattern);
      if (keys && keys.length > 0) {
        await (redis as any).del(...keys);
        logger.info({ count: keys.length, pattern: fullPattern }, 'Cache keys invalidated');
        return keys.length;
      }
    }

    return 0;
  } catch (error) {
    logger.warn({ error, pattern }, 'Cache pattern invalidation failed');
    return 0;
  }
};

// Alias for better naming
export const cacheDelPattern = invalidatePattern;

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
 * Cache warming utilities
 * Pre-populate cache with frequently accessed data
 */
export const CacheWarming = {
  /**
   * Warm cache for a specific machine's products
   */
  async warmMachineProducts(machineId: string, fetchFn: () => Promise<any>) {
    try {
      logger.info({ machineId }, 'Warming cache for machine products');
      const products = await fetchFn();
      await cacheSet(CacheKeys.products.byMachine(machineId), products, { ttl: CacheTTL.MEDIUM });
      return true;
    } catch (error) {
      logger.error({ error, machineId }, 'Failed to warm machine products cache');
      return false;
    }
  },

  /**
   * Warm cache for active campaigns
   */
  async warmCampaigns(fetchFn: () => Promise<any>) {
    try {
      logger.info('Warming cache for active campaigns');
      const campaigns = await fetchFn();
      await cacheSet(CacheKeys.campaigns.active(), campaigns, { ttl: CacheTTL.LONG });
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to warm campaigns cache');
      return false;
    }
  },

  /**
   * Warm cache for frequently accessed static content
   */
  async warmStaticContent(fetchFn: () => Promise<any>) {
    try {
      logger.info('Warming cache for static content');
      const content = await fetchFn();
      await cacheSet('static:content', content, { ttl: CacheTTL.DAY });
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to warm static content cache');
      return false;
    }
  }
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all user-related cache
   */
  async invalidateUser(userId: string): Promise<number> {
    return await invalidatePattern(CacheKeys.user.all(userId));
  },

  /**
   * Invalidate all product cache for a machine
   */
  async invalidateMachineProducts(machineId: string): Promise<number> {
    return await invalidatePattern(CacheKeys.products.all(machineId));
  },

  /**
   * Invalidate all machine cache
   */
  async invalidateMachines(): Promise<number> {
    return await invalidatePattern(CacheKeys.machines.all());
  },

  /**
   * Invalidate user cart
   */
  async invalidateCart(userId: string): Promise<number> {
    return await invalidatePattern(CacheKeys.cart.all(userId));
  },

  /**
   * Invalidate campaigns cache
   */
  async invalidateCampaigns(): Promise<number> {
    return await invalidatePattern(CacheKeys.campaigns.all());
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    // Get Redis INFO stats if available
    let redisStats = {
      connected_clients: '0',
      total_commands_processed: '0',
      keyspace_hits: '0',
      keyspace_misses: '0',
      used_memory_human: 'N/A'
    };

    if (typeof (redis as any).info === 'function') {
      const info = await (redis as any).info('stats');
      const lines = info.split('\r\n');
      const stats: Record<string, string> = {};

      lines.forEach((line: string) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key] = value;
          }
        }
      });

      redisStats = {
        connected_clients: stats.connected_clients || '0',
        total_commands_processed: stats.total_commands_processed || '0',
        keyspace_hits: stats.keyspace_hits || '0',
        keyspace_misses: stats.keyspace_misses || '0',
        used_memory_human: stats.used_memory_human || 'N/A'
      };
    }

    // Get Prometheus metrics for cache
    const cacheHitsTotal = await cacheHits.get();
    const cacheMissesTotal = await cacheMisses.get();

    const hits = cacheHitsTotal.values.reduce((sum, v) => sum + v.value, 0);
    const misses = cacheMissesTotal.values.reduce((sum, v) => sum + v.value, 0);
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    return {
      redis: redisStats,
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
        misses:
          cacheMissesTotal.values.find((m) => m.labels.key_prefix === v.labels.key_prefix)?.value ||
          0
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
