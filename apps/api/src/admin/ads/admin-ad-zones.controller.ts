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
import { CreateAdZoneDto } from './dto/create-ad-zone.dto';
import { UpdateAdZoneDto } from './dto/update-ad-zone.dto';

@ApiTags('admin / ad-zones')
@Controller('admin/ad-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@ApiBearerAuth()
export class AdminAdZonesController {
  constructor(private readonly service: AdminAdsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all ad zones',
    description: 'Returns every zone with activeAdCount and totalAdCount.',
  })
  findAll() {
    return this.service.findAllZones();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ad zone' })
  @ApiResponse({ status: 201, description: 'Zone created' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  create(@Body() dto: CreateAdZoneDto) {
    return this.service.createZone(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an ad zone' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  update(@Param('id') id: string, @Body() dto: UpdateAdZoneDto) {
    return this.service.updateZone(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an ad zone',
    description: 'Fails if there are active ads in the zone.',
  })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 400, description: 'Zone has active ads' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  remove(@Param('id') id: string) {
    return this.service.deleteZone(id);
  }
}
