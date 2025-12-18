import { listActivityLogs } from './admin-activity.repository.js';

export const getActivityLogs = async (params?: {
  page?: number;
  limit?: number;
  admin_id?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
}) => {
  return await listActivityLogs(params);
};
