import type { Request, Response } from 'express';
import { apiSuccess, errorResponse } from '../../utils/response.js';
import { getActivityLogs } from './admin-activity.service.js';

export const getActivityLogsApi = async (req: Request, res: Response) => {
  try {
    const { page, limit, admin_id, startDate, endDate, action, entityType } = req.query;
    
    const result = await getActivityLogs({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      admin_id: admin_id as string,
      startDate: startDate as string,
      endDate: endDate as string,
      action: action as string,
      entityType: entityType as string
    });
    
    // Frontend expects: { data: { logs: [...], meta: {...} } }
    return res.json(apiSuccess({ logs: result.data, meta: result.meta }));
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to fetch activity logs'));
  }
};
