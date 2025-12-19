import { Router } from 'express';
import { cookieAuth } from '../middleware/cookie-auth.middleware.js';
import {
  loginApi,
  getMeApi,
  logoutApi,
  changePasswordApi
} from '../modules/admin/admin-auth-api.controller.js';
import { refreshTokenApi } from '../modules/admin/admin-auth-refresh.controller.js';
import {
  getSessionsApi,
  revokeSessionApi,
  revokeAllSessionsApi
} from '../modules/admin/admin-sessions.controller.js';
import {
  getDashboardApi,
  getUsersApi,
  getUserDetailsApi,
  deleteUserApi,
  suspendUserApi,
  getMachinesApi,
  getMachineProductsApi,
  getProductsApi,
  getProductDetailsApi,
  getOrdersApi,
  getOrderDetailsApi,
  getFeedbackApi
} from '../modules/admin/admin.api.controller.js';

import { getChartDataApi } from '../modules/admin/admin-chart-data.api.controller.js';
import { getActivityLogsApi } from '../modules/admin/admin-activity.api.controller.js';
import {
  getNotificationsApi,
  markAsReadApi,
  markAllAsReadApi
} from '../modules/admin/admin-notifications.api.controller.js';
import {
  getSalesTrendsApi,
  getUserGrowthApi,
  getProductPerformanceApi,
  getMachineUtilizationApi,
  getOrderStatusApi
} from '../modules/admin/admin-analytics.api.controller.js';
import {
  exportDashboardPdfApi,
  exportOrderPdfApi,
  exportActivityPdfApi
} from '../modules/admin/admin-pdf.api.controller.js';
import { exportSalesApi } from '../modules/admin/admin-sales-export.controller.js';

import {
  getCampaignsApi,
  getCampaignByIdApi,
  createCampaignApi,
  updateCampaignApi,
  deleteCampaignApi,
  campaignUploadMiddleware
} from '../modules/campaigns/campaigns.api.controller.js';
import {
  getProfileApi,
  updateProfileApi,
  getCategoriesApi,
  getCategoryByIdApi,
  getCategoryProductsApi,
  createCategoryApi,
  updateCategoryApi,
  avatarUploadMiddleware,
  categoryUploadMiddleware
} from '../modules/admin/admin.profile.api.controller.js';
import { getContentApi, updateContentApi } from '../modules/content/content.api.controller.js';
import { generateImageApi } from '../modules/admin/admin.legacy.api.controller.js';
import { generateMachineQr } from '../modules/machines/machines.qr.service.js';
import { handleCacheStats, handleCacheClear } from '../modules/admin/admin.cache.controller.js';

const router = Router();

// =============================================================================
// Authentication Routes (no token required)
// =============================================================================
router.post('/auth/login', loginApi);
router.post('/auth/refresh', refreshTokenApi); // New: Token refresh

// =============================================================================
// Protected Routes (require JWT token via cookies or header)
// =============================================================================
router.use(cookieAuth); // All routes below require authentication

// Authentication
router.get('/auth/me', getMeApi);
router.post('/auth/logout', logoutApi);
router.put('/auth/change-password', changePasswordApi);

// Session Management (NEW)
router.get('/sessions', getSessionsApi);
router.delete('/sessions/:sessionId', revokeSessionApi);
router.post('/sessions/revoke-all', revokeAllSessionsApi);

// Dashboard
router.get('/dashboard', getDashboardApi);
router.get('/dashboard/charts', getChartDataApi);

// Users
router.get('/users', getUsersApi);
router.get('/users/:userId', getUserDetailsApi);
router.delete('/users/:userId', deleteUserApi);
router.post('/users/:userId/suspend', suspendUserApi);

// Machines
router.get('/machines', getMachinesApi);
router.get('/machines/:machineId/products', getMachineProductsApi);
router.post('/machines/:machineId/qr', async (req, res) => {
  try {
    await generateMachineQr(req.params.machineId);
    return res.json({ success: true, message: 'QR code regenerated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Products
router.get('/products', getProductsApi);
router.get('/products/:productId', getProductDetailsApi);

// Orders
router.get('/orders', getOrdersApi);
router.get('/orders/:orderId', getOrderDetailsApi);

// Campaigns
router.get('/campaigns', getCampaignsApi);
router.get('/campaigns/:campaignId', getCampaignByIdApi);
router.post('/campaigns', campaignUploadMiddleware, createCampaignApi);
router.put('/campaigns/:campaignId', campaignUploadMiddleware, updateCampaignApi);
router.delete('/campaigns/:campaignId', deleteCampaignApi);

// Categories
router.get('/categories', getCategoriesApi);
router.get('/categories/:categoryId', getCategoryByIdApi);
router.get('/categories/:categoryId/products', getCategoryProductsApi);
router.post('/categories', categoryUploadMiddleware, createCategoryApi);
router.put('/categories/:categoryId', categoryUploadMiddleware, updateCategoryApi);

// Feedback
router.get('/feedback', getFeedbackApi);

// Content
router.get('/content', getContentApi);
router.put('/content', updateContentApi);

// Profile
router.get('/profile', getProfileApi);
router.put('/profile', avatarUploadMiddleware, updateProfileApi);

// Activity Logs
router.get('/activity-logs', getActivityLogsApi);

// Notifications
router.get('/notifications', getNotificationsApi);
router.post('/notifications/:id/read', markAsReadApi);
router.post('/notifications/mark-all-read', markAllAsReadApi);

// Cache Management
router.get('/cache/stats', handleCacheStats);
router.post('/cache/clear', handleCacheClear);

// Analytics
router.get('/analytics/sales-trends', getSalesTrendsApi);

// PDF Exports
router.get('/export/dashboard/pdf', exportDashboardPdfApi);
router.get('/export/order/:orderId/pdf', exportOrderPdfApi);
router.get('/export/sales/pdf', exportSalesApi);  // NEW: Sales export
router.post('/export/activity/pdf', exportActivityPdfApi);

// Legacy Tools
router.post('/legacy/text-to-image', generateImageApi);
router.get('/analytics/user-growth', getUserGrowthApi);
router.get('/analytics/product-performance', getProductPerformanceApi);
router.get('/analytics/machine-utilization', getMachineUtilizationApi);
router.get('/analytics/order-status', getOrderStatusApi);

router.post('/export/dashboard-pdf', exportDashboardPdfApi);
router.get('/export/order-pdf/:orderId', exportOrderPdfApi);
router.post('/export/activity-pdf', exportActivityPdfApi);

// Legacy Tools
router.post('/legacy/text-to-image', generateImageApi);

export default router;
