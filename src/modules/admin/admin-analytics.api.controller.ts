import type { Request, Response } from 'express';
import { apiSuccess, errorResponse } from '../../utils/response.js';
import {
  getAnalyticsSalesTrends,
  getAnalyticsUserGrowth,
  getAnalyticsProductPerformance,
  getAnalyticsMachineUtilization,
  getAnalyticsOrderStatus,
} from './admin-analytics.service.js';

const VALID_PERIODS = ['7d', '30d', '90d', '1y'];
const MAX_PRODUCT_LIMIT = 100;

export const getSalesTrendsApi = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    
    // Validate period
    if (!VALID_PERIODS.includes(period as string)) {
      return res.status(400).json(
        errorResponse(400, `Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`)
      );
    }
    
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
    
    // Validate period
    if (!VALID_PERIODS.includes(period as string)) {
      return res.status(400).json(
        errorResponse(400, `Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`)
      );
    }
    
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
    const parsedLimit = parseInt(limit as string, 10);
    
    // Validate limit
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json(
        errorResponse(400, 'Invalid limit parameter. Must be a positive number.')
      );
    }
    
    // Cap at maximum
    const safeLimit = Math.min(parsedLimit, MAX_PRODUCT_LIMIT);
    
    const data = await getAnalyticsProductPerformance(safeLimit);
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
