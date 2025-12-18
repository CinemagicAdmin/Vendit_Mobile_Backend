import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export class PDFGenerator {
  private doc: PDFKit.PDFDocument;

  constructor() {
    this.doc = new PDFDocument({ margin: 50 });
  }

  /**
   * Add header to PDF
   */
  addHeader(title: string, subtitle?: string) {
    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(0.5);

    if (subtitle) {
      this.doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666')
        .text(subtitle, { align: 'center' })
        .fillColor('#000')
        .moveDown(1);
    } else {
      this.doc.moveDown(1);
    }

    // Add horizontal line
    this.doc
      .moveTo(50, this.doc.y)
      .lineTo(550, this.doc.y)
      .stroke()
      .moveDown(1);

    return this;
  }

  /**
   * Add section title
   */
  addSection(title: string) {
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title)
      .moveDown(0.5);

    return this;
  }

  /**
   * Add key-value pair
   */
  addKeyValue(key: string, value: string | number) {
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(key + ': ', { continued: true })
      .font('Helvetica')
      .text(String(value))
      .moveDown(0.3);

    return this;
  }

  /**
   * Add table
   */
  addTable(headers: string[], rows: string[][]) {
    const tableTop = this.doc.y;
    const columnWidth = 120;
    const rowHeight = 25;

    // Draw headers
    this.doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
      this.doc.text(header, 50 + i * columnWidth, tableTop, {
        width: columnWidth,
        align: 'left',
      });
    });

    // Draw header line
    this.doc
      .moveTo(50, tableTop + 15)
      .lineTo(50 + headers.length * columnWidth, tableTop + 15)
      .stroke();

    // Draw rows
    this.doc.font('Helvetica').fontSize(9);
    rows.forEach((row, rowIndex) => {
      const y = tableTop + rowHeight + rowIndex * rowHeight;
      
      row.forEach((cell, colIndex) => {
        this.doc.text(cell, 50 + colIndex * columnWidth, y, {
          width: columnWidth,
          align: 'left',
        });
      });
    });

    this.doc.moveDown(rows.length + 2);
    return this;
  }

  /**
   * Add footer with page numbers
   */
  addFooter() {
    const pages = this.doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);
      
      this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999')
        .text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          this.doc.page.height - 50,
          { align: 'center' }
        )
        .fillColor('#000');
    }

    return this;
  }

  /**
   * Pipe PDF to response
   */
  pipe(res: Response, filename: string) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    this.doc.pipe(res);
    return this.doc;
  }

  /**
   * Finalize PDF
   */
  end() {
    this.doc.end();
  }

  /**
   * Get the underlying PDFDocument
   */
  getDocument() {
    return this.doc;
  }
}
