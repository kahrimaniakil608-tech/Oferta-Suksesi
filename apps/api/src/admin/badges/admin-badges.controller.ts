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
import { AdminBadgesService } from './admin-badges.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';

@ApiTags('admin / badges')
@Controller('admin/badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminBadgesController {
  constructor(private readonly service: AdminBadgesService) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all badges with user counts' })
  findAll() {
    return this.service.findAll();
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new badge' })
  @ApiResponse({ status: 201, description: 'Badge created' })
  @ApiResponse({ status: 409, description: 'Badge name already exists' })
  create(@Body() dto: CreateBadgeDto) {
    return this.service.create(dto);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update badge fields' })
  @ApiParam({ name: 'id', description: 'Badge ID (UUID)' })
  update(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    return this.service.update(id, dto);
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a badge (removes from all users)' })
  @ApiParam({ name: 'id', description: 'Badge ID (UUID)' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // ─── Badge users ───────────────────────────────────────────────────────────

  @Get(':id/users')
  @ApiOperation({ summary: 'List all users who have this badge' })
  @ApiParam({ name: 'id', description: 'Badge ID (UUID)' })
  getBadgeUsers(@Param('id') id: string) {
    return this.service.getBadgeUsers(id);
  }

  // ─── Remove badge from user ────────────────────────────────────────────────

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove badge from a specific user' })
  @ApiParam({ name: 'id', description: 'Badge ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  removeUserBadge(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeUserBadge(id, userId);
  }
}
