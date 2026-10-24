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
import { AdminUsersService } from './admin-users.service';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ResetUserPasswordDto } from './dto/reset-password.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin / users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  // ─── Stats — must be before /:id ──────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'User statistics dashboard' })
  @ApiResponse({ status: 200, description: 'Aggregate user stats' })
  getStats() {
    return this.service.getStats();
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all users with pagination and filters',
    description:
      'Supports search by name/email, filter by role, isVerified, trustScore range, badge, and sorting.',
  })
  findAll(@Query() dto: ListUsersDto) {
    return this.service.findAll(dto);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a user (admin can assign any role)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  @Get(':id/moderation-logs')
  history(@Param('id') id: string, @Query('page') page = '1') {
    return this.service.moderationHistory(id, Number(page));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Full user detail',
    description:
      'Returns all user fields, badges, last 20 listings, payments, moderation history, and computed listing counts.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user fields',
    description:
      'Partial update. Role and trustScore changes are logged in moderation_logs.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  @Patch(':id/password')
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Hashes the new password and revokes all existing sessions.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.resetPassword(id, dto, req.user.id);
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete user',
    description:
      'Sets deletedAt, archives all active listings, and revokes all sessions. Does not remove DB record.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  softDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.softDelete(id, req.user.id);
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore soft-deleted user',
    description: 'Clears deletedAt. Listings are not auto-restored.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  restore(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.restore(id, req.user.id);
  }

  // ─── Suspend ──────────────────────────────────────────────────────────────

  @Post(':id/suspend')
  @ApiOperation({
    summary: 'Suspend user',
    description:
      'Sets suspendedAt/suspendedUntil, assigns the "suspended" badge, archives active listings, revokes sessions, and publishes a user.suspended event.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.suspend(id, dto, req.user.id);
  }

  // ─── Unsuspend ────────────────────────────────────────────────────────────

  @Post(':id/unsuspend')
  @ApiOperation({
    summary: 'Unsuspend user',
    description:
      'Clears suspendedAt/suspendedUntil and removes the "suspended" badge. Listings are not auto-restored.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  unsuspend(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.unsuspend(id, req.user.id);
  }

  // ─── Badges ───────────────────────────────────────────────────────────────

  @Post(':id/badges')
  @ApiOperation({ summary: 'Assign badge to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 409, description: 'User already has this badge' })
  assignBadge(
    @Param('id') id: string,
    @Body() dto: AssignBadgeDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.assignBadge(id, dto, req.user.id);
  }

  @Delete(':id/badges/:badgeSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove badge from user' })
  @ApiParam({ name: 'id',        description: 'User ID' })
  @ApiParam({ name: 'badgeSlug', description: 'Badge name (e.g. "verified")' })
  @ApiResponse({ status: 404, description: 'User does not have this badge' })
  removeBadge(
    @Param('id')        id: string,
    @Param('badgeSlug') badgeSlug: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.removeBadge(id, badgeSlug, req.user.id);
  }
}
