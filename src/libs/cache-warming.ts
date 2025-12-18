import { logger } from '../config/logger.js';
import { CacheWarming } from './cache.js';

/**
 * Initialize cache warming on application startup
 * Pre-loads frequently accessed data to improve initial response times
 */
export const initializeCacheWarming = async (): Promise<void> => {
  logger.info('Starting cache warming...');
  
  const startTime = Date.now();
  const results: { [key: string]: boolean } = {};

  try {
    // Warm campaigns cache
    try {
      const { fetchAllCampaigns } = await import('../modules/campaigns/campaigns.service.js');
      results.campaigns = await CacheWarming.warmCampaigns(fetchAllCampaigns);
    } catch (error) {
      logger.warn({ error }, 'Failed to warm campaigns cache');
      results.campaigns = false;
    }

    // Warm static content cache
    try {
      const { fetchStaticContent } = await import('../modules/users/users.service.js');
      results.staticContent = await CacheWarming.warmStaticContent(fetchStaticContent);
    } catch (error) {
      logger.warn({ error }, 'Failed to warm static content cache');
      results.staticContent = false;
    }

    const duration = Date.now() - startTime;
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    logger.info(
      {
        duration,
        results,
        success: `${successCount}/${totalCount}`
      },
      'Cache warming completed'
    );
  } catch (error) {
    logger.error({ error }, 'Cache warming failed');
  }
};
