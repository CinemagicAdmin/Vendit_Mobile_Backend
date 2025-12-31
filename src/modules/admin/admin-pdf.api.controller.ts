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
    // Fetch dashboard data with reasonable limits
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'CAPTURED') // CAPTURED = successful payment in this system
      .order('created_at', { ascending: false })
      .limit(10000); // Limit to last 10k payments for performance

    const { data: users } = await supabase.from('users').select('id').limit(50000); // Reasonable limit for user count

    const { data: machines } = await supabase
      .from('machines')
      .select('machine_operation_state')
      .limit(5000); // Reasonable limit for machine count

    const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOrders = (payments || []).length;
    const totalUsers = (users || []).length;
    const activeMachines = (machines || []).filter(
      (m) => m.machine_operation_state?.toLowerCase() === 'active'
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
      recentOrders: (recentOrders || []).map((order) => ({
        id: String(order.id),
        date: order.created_at,
        amount: Number(order.amount || 0),
        status: order.status || 'unknown'
      }))
    };

    // Validate data before generating PDF
    if (
      typeof dashboardData.totalRevenue !== 'number' ||
      typeof dashboardData.totalOrders !== 'number'
    ) {
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

    // Fetch order with ALL details
    const { data: order, error } = await supabase
      .from('payments')
      .select(
        `
        id,
        order_reference,
        created_at,
        amount,
        status,
        payment_method,
        transaction_id,
        currency,
        user_id,
        machine:machine_u_id(
          machine_tag,
          location_address
        ),
        payment_products(
          quantity,
          unit_price,
          total_price,
          product:product_u_id(
            description,
            brand_name
          )
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (error || !order) {
      res.status(404).json(errorResponse(404, 'Order not found'));
      return;
    }

    // Fetch user separately
    let customerName, customerEmail, customerPhone;
    if (order.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone_number')
        .eq('id', order.user_id)
        .single();

      if (user) {
        customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        customerEmail = user.email;
        customerPhone = user.phone_number;
      }
    }

    const orderData = {
      id: String(order.id),
      orderReference: order.order_reference || `#${order.id.slice(0, 8)}`,
      date: order.created_at,
      customerName,
      customerEmail,
      customerPhone,
      machine: (order.machine as any)?.[0]
        ? {
            name: (order.machine as any)[0].machine_tag,
            location: (order.machine as any)[0].location_address
          }
        : undefined,
      items: ((order.payment_products as any) || []).map((pp: any) => ({
        name: pp.product?.description || pp.product?.brand_name || 'Unknown Product',
        quantity: pp.quantity || 1,
        price: Number(pp.unit_price || 0)
      })),
      subtotal: Number(order.amount || 0),
      tax: 0, // Add tax calculation if needed
      total: Number(order.amount || 0),
      currency: order.currency || 'KWD',
      status: order.status || 'unknown',
      paymentMethod: order.payment_method,
      transactionId: order.transaction_id
    };

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

    // Build query with limit
    let query = supabase
      .from('admin_activity_logs')
      .select('admin_name, action, entity, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000); // Limit to 5000 most recent logs

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
