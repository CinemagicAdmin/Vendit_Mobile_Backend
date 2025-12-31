import { PDFGenerator } from '../../utils/pdf-generator.js';
import type { Response } from 'express';

interface SalesItem {
  orderReference: string;
  orderDate: string;
  machine: string;
  machineLocation: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  status: string;
}

export const generateSalesExportPDF = (
  sales: SalesItem[],
  filters: { startDate?: string; endDate?: string },
  res: Response
) => {
  const pdf = new PDFGenerator();
  const doc = pdf.pipe(res, `sales-export-${new Date().toISOString().split('T')[0]}.pdf`);

  // Header
  const dateRange =
    filters.startDate && filters.endDate
      ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
      : 'All Time';

  pdf.addHeader('Sales Export Report', `Period: ${dateRange}`);

  // Summary Section
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.length;
  const currency = sales[0]?.currency || 'KWD';

  pdf.addSection('Summary');
  pdf.addKeyValue('Total Orders', totalOrders.toLocaleString());
  pdf.addKeyValue('Total Revenue', `${currency} ${totalRevenue.toFixed(3)}`);
  pdf.addKeyValue('Report Generated', new Date().toLocaleString());
  doc.moveDown(1.5);

  // Sales Details Section
  pdf.addSection('Sales Details');
  doc.moveDown(0.5);

  sales.forEach((sale, index) => {
    if (index > 0) {
      doc.moveDown(0.5);
    }

    // Order Header
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text(`Order: ${sale.orderReference}`, { underline: true })
      .fillColor('#000');
    doc.moveDown(0.3);

    // Order Information
    doc.fontSize(9).font('Helvetica');
    doc.text(
      `Date: ${new Date(sale.orderDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    );
    doc.text(`Machine: ${sale.machine}`);
    doc.text(`Location: ${sale.machineLocation}`);
    doc.moveDown(0.2);

    // Customer Information
    doc.font('Helvetica-Bold').text('Customer:');
    doc.font('Helvetica');
    doc.text(`  Name: ${sale.userName}`);
    doc.text(`  Email: ${sale.userEmail}`);
    doc.text(`  Phone: ${sale.userPhone}`);
    doc.moveDown(0.2);

    // Payment Information
    doc.font('Helvetica-Bold').text('Payment:');
    doc.font('Helvetica');
    doc.text(`  Method: ${sale.paymentMethod}`);
    doc.text(`  Transaction ID: ${sale.transactionId}`);
    doc.text(`  Status: ${sale.status.toUpperCase()}`);
    doc.moveDown(0.3);

    // Order Items
    doc.font('Helvetica-Bold').text('Items:');
    doc.font('Helvetica');

    sale.items.forEach((item) => {
      const itemLine = `  • ${item.productName} x${item.quantity} @ ${currency} ${item.unitPrice.toFixed(3)} = ${currency} ${item.total.toFixed(3)}`;
      doc.text(itemLine);
    });

    doc.moveDown(0.3);

    // Order Total
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#16a34a')
      .text(`Total: ${currency} ${sale.total.toFixed(3)}`, { align: 'right' })
      .fillColor('#000');

    // Separator Line
    doc.moveDown(0.3);
    doc.strokeColor('#e5e7eb').moveTo(50, doc.y).lineTo(550, doc.y).stroke().strokeColor('#000');
  });

  // Footer with page numbers
  pdf.addFooter();
  pdf.end();
};
