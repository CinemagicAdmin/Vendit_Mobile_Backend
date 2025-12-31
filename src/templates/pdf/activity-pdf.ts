import { PDFGenerator } from '../../utils/pdf-generator.js';
import type { Response } from 'express';

interface ActivityLog {
  admin_name: string;
  action: string;
  entity: string;
  entity_id?: string;
  created_at: string;
}

interface ActivityFilters {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
}

export const generateActivityPDF = (
  logs: ActivityLog[],
  filters: ActivityFilters,
  res: Response
) => {
  const pdf = new PDFGenerator();
  const doc = pdf.pipe(res, `activity-logs-${new Date().toISOString().split('T')[0]}.pdf`);

  // Header
  const dateRange =
    filters.startDate && filters.endDate
      ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
      : 'All Time';

  pdf.addHeader('Activity Logs Report', `Period: ${dateRange}`);

  // Filters Applied
  pdf.addSection('Filters Applied');
  pdf.addKeyValue('Action', filters.action || 'All');
  pdf.addKeyValue('Entity Type', filters.entityType || 'All');
  doc.moveDown(1);

  // Activity Logs Table
  pdf.addSection(`Activity Log (${logs.length} entries)`);

  const headers = ['Date', 'Admin', 'Action', 'Entity'];
  const rows = logs.slice(0, 50).map((log) => [
    // Limit to 50 for PDF
    new Date(log.created_at).toLocaleDateString(),
    log.admin_name,
    log.action.toUpperCase(),
    log.entity + (log.entity_id ? ` #${log.entity_id}` : '')
  ]);

  pdf.addTable(headers, rows);

  if (logs.length > 50) {
    doc.moveDown(1);
    doc
      .fontSize(10)
      .fillColor('#666')
      .text(`Note: Showing first 50 of ${logs.length} total entries`, { align: 'center' })
      .fillColor('#000');
  }

  // Footer
  pdf.addFooter();
  pdf.end();
};
