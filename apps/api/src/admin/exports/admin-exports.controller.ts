import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminExportsService } from './admin-exports.service';

@ApiTags('admin / exports')
@Controller('admin/exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminExportsController {
  constructor(private readonly service: AdminExportsService) {}

  private dateStamp() {
    return new Date().toISOString().split('T')[0];
  }

  @Get('listings.csv')
  @ApiOperation({ summary: 'Export listings as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async listingsCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    res.set(
      'Content-Disposition',
      `attachment; filename="shpallje-${this.dateStamp()}.csv"`,
    );
    return this.service.listingsCsv({
      status,
      categoryId: categoryId ? Number(categoryId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('listings.pdf')
  @ApiOperation({ summary: 'Export listings as PDF' })
  async listingsPdf(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const buf = await this.service.listingsPdf({
      status,
      categoryId: categoryId ? Number(categoryId) : undefined,
      dateFrom,
      dateTo,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="shpallje-${this.dateStamp()}.pdf"`,
    });
    res.end(buf);
  }

  @Get('users.csv')
  @ApiOperation({ summary: 'Export users as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async usersCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('role') role?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    res.set(
      'Content-Disposition',
      `attachment; filename="perdorues-${this.dateStamp()}.csv"`,
    );
    return this.service.usersCsv({ role, dateFrom, dateTo });
  }

  @Get('users.pdf')
  @ApiOperation({ summary: 'Export users as PDF' })
  async usersPdf(
    @Res() res: Response,
    @Query('role') role?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const buf = await this.service.usersPdf({ role, dateFrom, dateTo });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="perdorues-${this.dateStamp()}.pdf"`,
    });
    res.end(buf);
  }

  @Get('revenue.csv')
  @ApiOperation({ summary: 'Export revenue as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async revenueCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    res.set(
      'Content-Disposition',
      `attachment; filename="te-ardhura-${this.dateStamp()}.csv"`,
    );
    return this.service.revenueCsv({ dateFrom, dateTo });
  }

  @Get('revenue.pdf')
  @ApiOperation({ summary: 'Export revenue as PDF' })
  async revenuePdf(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const buf = await this.service.revenuePdf({ dateFrom, dateTo });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="te-ardhura-${this.dateStamp()}.pdf"`,
    });
    res.end(buf);
  }

  @Get('weekly-report.pdf')
  @ApiOperation({ summary: 'Generate weekly summary report PDF' })
  async weeklyReport(@Res() res: Response) {
    const buf = await this.service.weeklyReportPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="raport-javor-${this.dateStamp()}.pdf"`,
    });
    res.end(buf);
  }
}
