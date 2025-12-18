import { PDFGenerator } from '../../utils/pdf-generator.js';
import type { Response } from 'express';

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  activeMachines: number;
  recentOrders?: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

export const generateDashboardPDF = (data: DashboardData, res: Response) => {
  const pdf = new PDFGenerator();
  const doc = pdf.pipe(res, `dashboard-${new Date().toISOString().split('T')[0]}.pdf`);

  // Header
  pdf.addHeader(
    'Admin Dashboard Summary',
    `Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`
  );

  // Key Metrics Section
  pdf.addSection('Key Metrics');
  pdf.addKeyValue('Total Revenue', `$${data.totalRevenue.toLocaleString()}`);
  pdf.addKeyValue('Total Orders', data.totalOrders.toLocaleString());
  pdf.addKeyValue('Total Users', data.totalUsers.toLocaleString());
  pdf.addKeyValue('Active Machines', data.activeMachines.toLocaleString());
  
  doc.moveDown(1);

  // Recent Orders Section
  if (data.recentOrders && data.recentOrders.length > 0) {
    pdf.addSection('Recent Orders');
    
    const headers = ['Order ID', 'Date', 'Amount', 'Status'];
    const rows = data.recentOrders.map(order => [
      order.id,
      new Date(order.date).toLocaleDateString(),
      `$${order.amount.toFixed(2)}`,
      order.status,
    ]);

    pdf.addTable(headers, rows);
  }

  // Footer
  pdf.addFooter();
  pdf.end();
};
