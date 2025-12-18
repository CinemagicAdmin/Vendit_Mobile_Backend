import {
  getSalesTrends,
  getUserGrowth,
  getProductPerformance,
  getMachineUtilization,
  getOrderStatusBreakdown,
} from './admin-analytics.repository.js';

export const getAnalyticsSalesTrends = async (period: string = '30d') => {
  return await getSalesTrends(period);
};

export const getAnalyticsUserGrowth = async (period: string = '30d') => {
  return await getUserGrowth(period);
};

export const getAnalyticsProductPerformance = async (limit: number = 10) => {
  return await getProductPerformance(limit);
};

export const getAnalyticsMachineUtilization = async () => {
  return await getMachineUtilization();
};

export const getAnalyticsOrderStatus = async () => {
  return await getOrderStatusBreakdown();
};
