import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { ListingStatus, Role } from '@prisma/client';
import { csvFile, csvStream, ExportPage, exportDateRange, requireCompleteExport, MAX_EXPORT_ROWS, completedRevenueByCurrency } from './export-format';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, 'assets', 'logo-black.png');

@Injectable()
export class AdminExportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listings CSV ──
  async listingsCsv(filters: {
    status?: string;
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StreamableFile> {
    const map = (l: Awaited<ReturnType<AdminExportsService['queryListings']>>[number]) => ({
      ID: l.id,
      Titulli: l.title,
      Kategoria: l.category?.name ?? '',
      Qyteti: l.city?.name ?? '',
      Statusi: l.status,
      Shikime: l.viewsCount,
      Kontakte: l.contactClicks,
      Autori: l.user?.name ?? l.user?.email ?? 'Vizitor',
      Krijuar: l.createdAt.toISOString().split('T')[0],
    });
    return csvStream(['ID', 'Titulli', 'Kategoria', 'Qyteti', 'Statusi', 'Shikime', 'Kontakte', 'Autori', 'Krijuar'], page => this.queryListings(filters, page), map);
  }

  // ── Listings PDF ──
  async listingsPdf(filters: {
    status?: string;
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Buffer> {
    const listings = await this.queryListings(filters);
    return this.generatePdf(
      'Raporti i Shpalljeve',
      ['#', 'Titulli', 'Kategoria', 'Statusi', 'Shikime', 'Krijuar'],
      listings.map((l, i) => [
        String(i + 1),
        l.title.substring(0, 35),
        l.category?.name ?? '',
        l.status,
        String(l.viewsCount),
        l.createdAt.toISOString().split('T')[0],
      ]),
      [0.06, 0.34, 0.18, 0.14, 0.1, 0.18],
    );
  }

  // ── Users CSV ──
  async usersCsv(filters: {
    role?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StreamableFile> {
    const map = (u: Awaited<ReturnType<AdminExportsService['queryUsers']>>[number]) => ({
      ID: u.id,
      Emri: u.name ?? '',
      Email: u.email,
      Roli: u.role,
      'Trust Score': u.trustScore,
      Shpallje: u._count.listings,
      Regjistruar: u.createdAt.toISOString().split('T')[0],
    });
    return csvStream(['ID', 'Emri', 'Email', 'Roli', 'Trust Score', 'Shpallje', 'Regjistruar'], page => this.queryUsers(filters, page), map);
  }

  // ── Users PDF ──
  async usersPdf(filters: {
    role?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Buffer> {
    const users = await this.queryUsers(filters);
    return this.generatePdf(
      'Raporti i Perdoruesve',
      ['#', 'Emri', 'Email', 'Roli', 'Trust', 'Shpallje', 'Regjistruar'],
      users.map((u, i) => [
        String(i + 1),
        (u.name ?? '').substring(0, 20),
        u.email.substring(0, 25),
        u.role,
        String(u.trustScore),
        String(u._count.listings),
        u.createdAt.toISOString().split('T')[0],
      ]),
      [0.05, 0.18, 0.25, 0.12, 0.1, 0.1, 0.2],
    );
  }

  // ── Revenue CSV ──
  async revenueCsv(filters: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StreamableFile> {
    const map = (p: Awaited<ReturnType<AdminExportsService['queryRevenue']>>[number]) => ({
      ID: p.id,
      Tipi: p.type,
      Shuma: Number(p.amount),
      Valuta: p.currency,
      Statusi: p.status,
      Perdoruesi: p.user?.name ?? p.user?.email ?? '',
      Data: p.createdAt.toISOString().split('T')[0],
    });
    return csvStream(['ID', 'Tipi', 'Shuma', 'Valuta', 'Statusi', 'Perdoruesi', 'Data'], page => this.queryRevenue(filters, page), map);
  }

  // ── Revenue PDF ──
  async revenuePdf(filters: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Buffer> {
    const payments = await this.queryRevenue(filters);
    const totals = completedRevenueByCurrency(payments);
    const summary = totals.length ? totals.map(total => `${total.currency} ${total.amount}`).join('; ') : '0';
    return this.generatePdf(
      `Pagesat - Te perfunduara: ${summary}`,
      ['#', 'Tipi', 'Shuma', 'Statusi', 'Perdoruesi', 'Data'],
      payments.map((p, i) => [
        String(i + 1),
        p.type,
        `${p.currency} ${p.amount.toFixed(2)}`,
        p.status,
        (p.user?.name ?? p.user?.email ?? '').substring(0, 20),
        p.createdAt.toISOString().split('T')[0],
      ]),
      [0.06, 0.16, 0.16, 0.16, 0.26, 0.2],
    );
  }

  // ── Weekly summary ──
  async weeklyReportPdf(): Promise<Buffer> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [newListings, newUsers, payments, byStatus] = await Promise.all([
      this.prisma.listing.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.payment.findMany({
        where: { createdAt: { gte: weekAgo }, status: 'COMPLETED' },
        select: { amount: true, currency: true, status: true },
      }),
      this.prisma.listing.groupBy({ by: ['status'], _count: true }),
    ]);

    const totals = completedRevenueByCurrency(payments);
    const statusLines = byStatus.map((s) => [`${s.status}`, `${s._count}`]);

    return this.generatePdf(
      `Raporti Javor: ${weekAgo.toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`,
      ['Metrika', 'Vlera'],
      [
        ['Shpallje te Reja', String(newListings)],
        ['Perdorues te Rinj', String(newUsers)],
        ...(totals.length ? totals.map(total => [`Te Ardhura (${total.currency})`, total.amount]) : [['Te Ardhura (te perfunduara)', '0']]),
        ...statusLines.map(([status, count]) => [`Shpallje: ${status}`, count]),
      ],
      [0.65, 0.35],
    );
  }

  // ── Private helpers ──

  private async queryListings(filters: {
    status?: string;
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
  }, page?: ExportPage) {
    const where: any = {};
    if (filters.status && !Object.values(ListingStatus).includes(filters.status as ListingStatus)) throw new BadRequestException('Invalid listing status');
    if (filters.categoryId !== undefined && (!Number.isSafeInteger(filters.categoryId) || filters.categoryId < 1)) throw new BadRequestException('Invalid category');
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    where.createdAt = exportDateRange(filters);
    if (page) {
      where.AND = [{ createdAt: { lte: page.asOf } }, ...(page.before ? [{ OR: [{ createdAt: { lt: page.before.createdAt } }, { createdAt: page.before.createdAt, id: { lt: page.before.id } }] }] : [])];
    }
    const rows = await this.prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        viewsCount: true,
        contactClicks: true,
        createdAt: true,
        category: { select: { name: true } },
        city: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page ? 1000 : MAX_EXPORT_ROWS + 1,
    });
    return page ? rows : requireCompleteExport(rows);
  }

  private async queryUsers(filters: {
    role?: string;
    dateFrom?: string;
    dateTo?: string;
  }, page?: ExportPage) {
    const where: any = {};
    if (filters.role && !Object.values(Role).includes(filters.role as Role)) throw new BadRequestException('Invalid role');
    if (filters.role) where.role = filters.role;
    where.createdAt = exportDateRange(filters);
    if (page) {
      where.AND = [{ createdAt: { lte: page.asOf } }, ...(page.before ? [{ OR: [{ createdAt: { lt: page.before.createdAt } }, { createdAt: page.before.createdAt, id: { lt: page.before.id } }] }] : [])];
    }
    const rows = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trustScore: true,
        createdAt: true,
        _count: { select: { listings: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page ? 1000 : MAX_EXPORT_ROWS + 1,
    });
    return page ? rows : requireCompleteExport(rows);
  }

  private async queryRevenue(filters: {
    dateFrom?: string;
    dateTo?: string;
  }, page?: ExportPage) {
    const where: any = {};
    where.createdAt = exportDateRange(filters);
    if (page) {
      where.AND = [{ createdAt: { lte: page.asOf } }, ...(page.before ? [{ OR: [{ createdAt: { lt: page.before.createdAt } }, { createdAt: page.before.createdAt, id: { lt: page.before.id } }] }] : [])];
    }
    const rows = await this.prisma.payment.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page ? 1000 : MAX_EXPORT_ROWS + 1,
    });
    return page ? rows : requireCompleteExport(rows);
  }

  private generatePdf(
    title: string,
    headers: string[],
    rows: string[][],
    colWidths?: number[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const marginLeft = 40;
      const marginRight = 40;
      const tableWidth = pageWidth - marginLeft - marginRight;
      const rowHeight = 22;
      const headerRowHeight = 28;

      // ── Header with logo ──
      const logoExists = fs.existsSync(LOGO_PATH);
      if (logoExists) {
        doc.image(LOGO_PATH, marginLeft, 30, { height: 30 });
      } else {
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a1a')
          .text('OfertaSuksesi', marginLeft, 35);
      }

      // Date on the right side of header
      doc.fontSize(8).font('Helvetica').fillColor('#999')
        .text(`Gjeneruar: ${new Date().toISOString().split('T')[0]}`, marginLeft, 45, {
          width: tableWidth,
          align: 'right',
        });

      // Title
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text(title, marginLeft, doc.y, { width: tableWidth });
      doc.moveDown(0.3);

      // Separator line under title
      const sepY = doc.y;
      doc.moveTo(marginLeft, sepY)
        .lineTo(pageWidth - marginRight, sepY)
        .strokeColor('#e0e0e0')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.8);

      // ── Table ──
      // Calculate column widths
      const computedColWidths = colWidths
        ? colWidths.map((w) => w * tableWidth)
        : headers.map(() => tableWidth / headers.length);

      let y = doc.y;

      const drawTableHeader = () => {
        // Header background
        doc.save();
        doc.rect(marginLeft, y, tableWidth, headerRowHeight)
          .fill('#1a1a1a');
        doc.restore();

        // Header text
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        let x = marginLeft;
        headers.forEach((h, i) => {
          doc.text(h, x + 6, y + 8, {
            width: computedColWidths[i] - 12,
            align: 'left',
          });
          x += computedColWidths[i];
        });
        y += headerRowHeight;
      };

      drawTableHeader();

      // Data rows
      doc.font('Helvetica').fontSize(7.5);
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];

        // Page break check
        if (y + rowHeight > doc.page.height - 70) {
          this.addFooter(doc, marginLeft, tableWidth);
          doc.addPage();
          y = 40;
          drawTableHeader();
        }

        // Alternating row background
        if (rowIdx % 2 === 0) {
          doc.save();
          doc.rect(marginLeft, y, tableWidth, rowHeight).fill('#f8f9fa');
          doc.restore();
        }

        // Row bottom border
        doc.moveTo(marginLeft, y + rowHeight)
          .lineTo(pageWidth - marginRight, y + rowHeight)
          .strokeColor('#eee')
          .lineWidth(0.5)
          .stroke();

        // Cell text
        doc.fillColor('#333');
        let x = marginLeft;
        row.forEach((cell, i) => {
          doc.text(cell, x + 6, y + 6, {
            width: computedColWidths[i] - 12,
            align: 'left',
          });
          x += computedColWidths[i];
        });
        y += rowHeight;
      }

      // Left and right table borders
      const tableStartY = doc.y;
      doc.moveTo(marginLeft, tableStartY);

      // Footer
      this.addFooter(doc, marginLeft, tableWidth);

      doc.end();
    });
  }

  private addFooter(
    doc: any,
    marginLeft: number,
    tableWidth: number,
  ) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 45;

    // Footer separator
    doc.moveTo(marginLeft, footerY)
      .lineTo(marginLeft + tableWidth, footerY)
      .strokeColor('#e0e0e0')
      .lineWidth(0.5)
      .stroke();

    // Footer text
    doc.fontSize(7).font('Helvetica').fillColor('#999');
    doc.text(
      'OfertaSuksesi - Platforma e Shpalljeve',
      marginLeft,
      footerY + 8,
      { width: tableWidth * 0.5, align: 'left' },
    );
    doc.text(
      'www.ofertasuksesi.com',
      marginLeft + tableWidth * 0.5,
      footerY + 8,
      { width: tableWidth * 0.5, align: 'right' },
    );
  }
}
