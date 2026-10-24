import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminSettingsService } from './admin-settings.service';

@ApiTags('admin / settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all site settings grouped by section',
    description: 'Returns { general: {...}, listings: {...}, moderation: {...}, ... }. Missing keys show their defaults.',
  })
  getAll() {
    return this.service.getAll();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk-update site settings',
    description: 'Pass a flat object of key→value. Unknown keys are silently ignored.',
  })
  @ApiResponse({ status: 200, description: '{ updated: number }' })
  bulkSet(@Body('settings') settings: Record<string, string>) {
    return this.service.bulkSet(settings ?? {});
  }
}
