import { PDFGenerator } from '../../utils/pdf-generator.js';
import type { Response } from 'express';

interface OrderData {
  id: string;
  orderReference: string;
  date: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  machine?: {
    name: string;
    location: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
}

export const generateOrderPDF = (order: OrderData, res: Response) => {
  const pdf = new PDFGenerator();
  const doc = pdf.pipe(res, `order-${order.orderReference}.pdf`);

  // Header with order reference
  pdf.addHeader(
    `Order ${order.orderReference}`,
    `Date: ${new Date(order.date).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`
  );

  // Customer Information
  if (order.customerName || order.customerEmail || order.customerPhone) {
    pdf.addSection('Customer Information');
    if (order.customerName) {
      pdf.addKeyValue('Name', order.customerName);
    }
    if (order.customerEmail) {
      pdf.addKeyValue('Email', order.customerEmail);
    }
    if (order.customerPhone) {
      pdf.addKeyValue('Phone', order.customerPhone);
    }
    doc.moveDown(1);
  }

  // Machine Information
  if (order.machine) {
    pdf.addSection('Machine Information');
    pdf.addKeyValue('Machine', order.machine.name);
    pdf.addKeyValue('Location', order.machine.location);
    doc.moveDown(1);
  }

  // Order Items
  pdf.addSection('Order Items');
  
  const headers = ['Item', 'Quantity', 'Price', 'Subtotal'];
  const rows = order.items.map(item => [
    item.name,
    item.quantity.toString(),
    `${order.currency} ${item.price.toFixed(3)}`,
    `${order.currency} ${(item.quantity * item.price).toFixed(3)}`,
  ]);

  pdf.addTable(headers, rows);

  // Order Summary
  doc.moveDown(1);
  pdf.addSection('Order Summary');
  pdf.addKeyValue('Subtotal', `${order.currency} ${order.subtotal.toFixed(3)}`);
  if (order.tax && order.tax > 0) {
    pdf.addKeyValue('Tax', `${order.currency} ${order.tax.toFixed(3)}`);
  }
  pdf.addKeyValue('Total Amount', `${order.currency} ${order.total.toFixed(3)}`);
  pdf.addKeyValue('Status', order.status.toUpperCase());
  
  // Payment Information
  if (order.paymentMethod || order.transactionId) {
    doc.moveDown(0.5);
    if (order.paymentMethod) {
      pdf.addKeyValue('Payment Method', order.paymentMethod);
    }
    if (order.transactionId) {
      pdf.addKeyValue('Transaction ID', order.transactionId);
    }
  }

  // Footer
  pdf.addFooter();
  pdf.end();
};
