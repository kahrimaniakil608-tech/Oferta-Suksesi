import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdsService } from './ads.service';
import { TrackImpressionDto } from './dto/track-impression.dto';
import { ZoneContextDto } from './dto/zone-context.dto';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly service: AdsService) {}

  // ─── GET /ads/zone/:slug ───────────────────────────────────────────────────

  @Get('zone/:slug')
  @ApiOperation({
    summary: 'Get ads to display for a zone (public)',
    description:
      'Returns active, non-expired ads sorted by priority DESC, limited to zone maxAds. ' +
      'Pass categoryId/cityId query params for targeted filtering.',
  })
  @ApiParam({ name: 'slug', description: 'Zone slug (e.g. "header-banner")' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  getAdsForZone(@Param('slug') slug: string, @Query() ctx: ZoneContextDto) {
    return this.service.getAdsForZone(slug, ctx);
  }

  // ─── POST /ads/:id/impression ─────────────────────────────────────────────

  @Post(':id/impression')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track an ad impression (public)',
    description:
      'Deduplicated: max 1 impression per IP per ad per hour. Pass pageUrl for analytics.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  trackImpression(
    @Param('id') id: string,
    @Body() dto: TrackImpressionDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '';
    return this.service.trackImpression(id, dto, ip);
  }

  // ─── POST /ads/:id/click ──────────────────────────────────────────────────

  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track an ad click (public)',
    description:
      'Deduplicated: max 1 click per IP per ad per hour. Returns redirectUrl.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID' })
  @ApiResponse({ status: 200, description: '{ tracked: boolean, redirectUrl: string }' })
  trackClick(@Param('id') id: string, @Req() req: Request) {
    const ip = req.ip ?? '';
    return this.service.trackClick(id, ip);
  }
}
