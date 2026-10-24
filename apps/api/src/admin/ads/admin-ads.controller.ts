import type { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminAdsService } from './admin-ads.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { DuplicateAdDto } from './dto/duplicate-ad.dto';
import { ListAdsDto } from './dto/list-ads.dto';
import { UpdateAdDto } from './dto/update-ad.dto';

@ApiTags('admin / ads')
@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminAdsController {
  constructor(private readonly service: AdminAdsService) {}

  // ─── Static routes — must be before /:id ──────────────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary: 'Ad dashboard overview',
    description:
      'Total active campaigns, impressions/clicks today, avg CTR, top performing and underperforming ads.',
  })
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('zones/performance')
  @ApiOperation({
    summary: 'Per-zone performance summary',
    description: 'Total impressions, clicks, CTR and active campaign count for each zone.',
  })
  getZonesPerformance() {
    return this.service.getZonesPerformance();
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List ad campaigns',
    description:
      'Filterable by zoneId, status (active/scheduled/expired/paused), and search. Includes CTR per campaign.',
  })
  findAll(@Query() dto: ListAdsDto) {
    return this.service.findAll(dto);
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Full campaign detail',
    description: 'All fields + zone info + daily stats (last 30 days) + unique viewers + CTR.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Detailed analytics for one campaign',
    description:
      'Lifetime daily impressions/clicks, hourly breakdown for today, top pages, unique vs total impressions.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  getAnalytics(@Param('id') id: string) {
    return this.service.getCampaignAnalytics(id);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new ad campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  @ApiResponse({ status: 400, description: 'Zone at capacity or invalid dates' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  create(@Body() dto: CreateAdDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  update(@Param('id') id: string, @Body() dto: UpdateAdDto, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any).id);
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete campaign',
    description: 'Sets deletedAt and pauses the campaign. Impression/click data is preserved.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  // ─── Pause ────────────────────────────────────────────────────────────────

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign (set isActive = false)' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  pause(@Param('id') id: string) {
    return this.service.pause(id);
  }

  // ─── Resume ───────────────────────────────────────────────────────────────

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused campaign (set isActive = true)' })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  resume(@Param('id') id: string) {
    return this.service.resume(id);
  }

  // ─── Duplicate ────────────────────────────────────────────────────────────

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate a campaign with new dates',
    description: 'Copies all fields. Duplicate starts paused for review.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  duplicate(@Param('id') id: string, @Body() dto: DuplicateAdDto) {
    return this.service.duplicate(id, dto);
  }
}
