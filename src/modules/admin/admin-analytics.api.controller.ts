import type { Request, Response } from 'express';
import { apiSuccess, errorResponse } from '../../utils/response.js';
import {
  getAnalyticsSalesTrends,
  getAnalyticsUserGrowth,
  getAnalyticsProductPerformance,
  getAnalyticsMachineUtilization,
  getAnalyticsOrderStatus,
} from './admin-analytics.service.js';

export const getSalesTrendsApi = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const data = await getAnalyticsSalesTrends(period as string);
    return res.json(apiSuccess(data));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch sales trends'));
  }
};

export const getUserGrowthApi = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const data = await getAnalyticsUserGrowth(period as string);
    return res.json(apiSuccess(data));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch user growth'));
  }
};

export const getProductPerformanceApi = async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const data = await getAnalyticsProductPerformance(parseInt(limit as string));
    return res.json(apiSuccess(data));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch product performance'));
  }
};

export const getMachineUtilizationApi = async (req: Request, res: Response) => {
  try {
    const data = await getAnalyticsMachineUtilization();
    return res.json(apiSuccess(data));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch machine utilization'));
  }
};

export const getOrderStatusApi = async (req: Request, res: Response) => {
  try {
    const data = await getAnalyticsOrderStatus();
    return res.json(apiSuccess(data));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch order status'));
  }
};
