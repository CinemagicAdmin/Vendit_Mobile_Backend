import type { Request, Response } from 'express';
import { supabase } from '../../libs/supabase.js';
import { generateSalesExportPDF } from '../../templates/pdf/sales-export-pdf.js';
import { errorResponse } from '../../utils/response.js';

/**
 * Export sales data as PDF
 * GET /api/admin/export/sales/pdf
 */
export const exportSalesApi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build query for sales data
    let query = supabase
      .from('payments')
      .select(
        `
        id,
        order_reference,
        created_at,
        amount,
        payment_method,
        status,
        transaction_id,
        currency,
        machine:machine_u_id(
          machine_tag,
          location_address
        ),
        user:users!payments_user_id_fkey(
          first_name,
          last_name,
          email,
          phone_number
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
      .eq('status', status || 'CAPTURED') // Default to successful orders
      .order('created_at', { ascending: false })
      .limit(1000); // Reasonable limit for PDF

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Transform data for PDF
    const salesData = (orders || []).map((order: any) => ({
      orderReference: order.order_reference || `#${order.id.slice(0, 8)}`,
      orderDate: order.created_at,
      machine: order.machine?.[0]?.machine_tag || 'N/A',
      machineLocation: order.machine?.[0]?.location_address || 'N/A',
      userName: order.user?.[0]
        ? `${order.user[0].first_name || ''} ${order.user[0].last_name || ''}`.trim() || 'Guest'
        : 'Guest',
      userEmail: order.user?.[0]?.email || 'N/A',
      userPhone: order.user?.[0]?.phone_number || 'N/A',
      items: (order.payment_products || []).map((pp: any) => ({
        productName: pp.product?.description || pp.product?.brand_name || 'Unknown Product',
        quantity: pp.quantity || 1,
        unitPrice: Number(pp.unit_price || 0),
        total: Number(pp.total_price || 0)
      })),
      subtotal: Number(order.amount || 0),
      total: Number(order.amount || 0),
      currency: order.currency || 'KWD',
      paymentMethod: order.payment_method || 'N/A',
      transactionId: order.transaction_id || 'N/A',
      status: order.status || 'unknown'
    }));

    // Generate PDF
    generateSalesExportPDF(
      salesData,
      { startDate: startDate as string, endDate: endDate as string },
      res
    );
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json(errorResponse(statusCode, error.message || 'Failed to generate sales export'));
  }
};
