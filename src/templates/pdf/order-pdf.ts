import { PDFGenerator } from '../../utils/pdf-generator.js';
import type { Response } from 'express';

interface OrderData {
  id: string;
  date: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: string;
}

export const generateOrderPDF = (order: OrderData, res: Response) => {
  const pdf = new PDFGenerator();
  const doc = pdf.pipe(res, `order-${order.id}.pdf`);

  // Header
  pdf.addHeader(
    `Order #${order.id}`,
    `Date: ${new Date(order.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`
  );

  // Customer Information
  if (order.customerName || order.customerEmail) {
    pdf.addSection('Customer Information');
    if (order.customerName) {
      pdf.addKeyValue('Name', order.customerName);
    }
    if (order.customerEmail) {
      pdf.addKeyValue('Email', order.customerEmail);
    }
    doc.moveDown(1);
  }

  // Order Items
  pdf.addSection('Order Items');
  
  const headers = ['Item', 'Quantity', 'Price', 'Subtotal'];
  const rows = order.items.map(item => [
    item.name,
    item.quantity.toString(),
    `$${item.price.toFixed(2)}`,
    `$${(item.quantity * item.price).toFixed(2)}`,
  ]);

  pdf.addTable(headers, rows);

  // Order Summary
  doc.moveDown(1);
  pdf.addSection('Order Summary');
  pdf.addKeyValue('Total Amount', `$${order.total.toFixed(2)}`);
  pdf.addKeyValue('Status', order.status.toUpperCase());

  // Footer
  pdf.addFooter();
  pdf.end();
};
