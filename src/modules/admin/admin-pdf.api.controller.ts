import type { Request, Response } from 'express';
import { errorResponse } from '../../utils/response.js';
import { generateDashboardPDF } from '../../templates/pdf/dashboard-pdf.js';
import { generateOrderPDF } from '../../templates/pdf/order-pdf.js';
import { generateActivityPDF } from '../../templates/pdf/activity-pdf.js';
import { supabase } from '../../libs/supabase.js';

/**
 * Export dashboard as PDF
 */
export const exportDashboardPdfApi = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch dashboard data
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'CAPTURED'); // CAPTURED = successful payment in this system

    const { data: users } = await supabase
      .from('users')
      .select('id');

    const { data: machines } = await supabase
      .from('machines')
      .select('machine_operation_state');

    const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOrders = (payments || []).length;
    const totalUsers = (users || []).length;
    const activeMachines = (machines || []).filter(
      m => m.machine_operation_state?.toLowerCase() === 'active'
    ).length;

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('payments')
      .select('id, created_at, amount, status')
      .order('created_at', { ascending: false })
      .limit(10);

    const dashboardData = {
      totalRevenue,
      totalOrders,
      totalUsers,
      activeMachines,
      recentOrders: (recentOrders || []).map(order => ({
        id: String(order.id),
        date: order.created_at,
        amount: Number(order.amount || 0),
        status: order.status || 'unknown',
      })),
    };

    // Validate data before generating PDF
    if (typeof dashboardData.totalRevenue !== 'number' || 
        typeof dashboardData.totalOrders !== 'number') {
      res.status(400).json(errorResponse(400, 'Invalid dashboard data'));
      return;
    }

    generateDashboardPDF(dashboardData, res);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to generate dashboard PDF'));
  }
};

/**
 * Export order as PDF
 */
export const exportOrderPdfApi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    // Fetch order details
    const { data: order, error } = await supabase
      .from('payments')
      .select(`
        id,
        created_at,
        amount,
        status,
        user_u_id,
        payment_products (
          quantity,
          product:product_u_id (
            description,
            brand_name,
            unit_price
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      res.status(404).json(errorResponse(404, 'Order not found'));
      return;
    }

    // Fetch user separately
    let customerName: string | undefined;
    let customerEmail: string | undefined;
    
    if (order.user_u_id) {
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', order.user_u_id)
        .single();
      
      customerName = user?.name;
      customerEmail = user?.email;
    }

    const orderData = {
      id: String(order.id),
      date: order.created_at,
      customerName,
      customerEmail,
      items: (order.payment_products || []).map((pp: any) => ({
        name: pp.product?.description || pp.product?.brand_name || 'Unknown Product',
        quantity: pp.quantity || 1,
        price: Number(pp.product?.unit_price || 0),
      })),
      total: Number(order.amount || 0),
      status: order.status || 'unknown',
    };

    // Validate order data
    if (!orderData.id || orderData.items.length === 0) {
      res.status(400).json(errorResponse(400, 'Invalid order data'));
      return;
    }

    generateOrderPDF(orderData, res);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to generate order PDF'));
  }
};

/**
 * Export activity logs as PDF
 */
export const exportActivityPdfApi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, action, entityType } = req.body;

    // Build query
    let query = supabase
      .from('admin_activity_logs')
      .select('admin_name, action, entity, entity_id, created_at')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (action) {
      query = query.ilike('action', action);
    }
    if (entityType) {
      query = query.ilike('entity', entityType);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    generateActivityPDF(logs || [], { startDate, endDate, action, entityType }, res);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to generate activity PDF'));
  }
};
