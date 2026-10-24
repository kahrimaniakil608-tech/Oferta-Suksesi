import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto, UserSortOption } from './dto/list-users.dto';
import { ResetUserPasswordDto } from './dto/reset-password.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminUsersService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Write a user-level admin action to moderation_logs (listingId is nullable). */
  private async logAction(params: {
    action: string;
    reason?: string;
    moderatorId?: string;
    subjectUserId: string;
  }): Promise<void> {
    await this.prisma.moderationLog.create({
      data: {
        subjectUserId: params.subjectUserId,
        action:      params.action,
        reason:      params.reason,
        moderatorId: params.moderatorId,
        spamScore:   0,
        // listingId intentionally null — user-level action
      },
    });
  }

  async moderationHistory(id: string, page = 1) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.moderationLog.findMany({ where: { subjectUserId: id }, include: { moderator: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page-1)*50, take: 50 }),
      this.prisma.moderationLog.count({ where: { subjectUserId: id } }),
    ]);
    return { data, total, page };
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(dto: ListUsersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      sort = UserSortOption.NEWEST,
      hasBadge,
      isVerified,
      trustScoreMin,
      trustScoreMax,
    } = dto;

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: dto.deleted === true ? { not: null } : null };

    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role !== undefined)       where.role       = role;
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (trustScoreMin !== undefined || trustScoreMax !== undefined) {
      where.trustScore = {};
      if (trustScoreMin !== undefined) where.trustScore.gte = trustScoreMin;
      if (trustScoreMax !== undefined) where.trustScore.lte = trustScoreMax;
    }
    if (hasBadge) {
      where.badges = { some: { badge: { name: hasBadge } } };
    }

    let orderBy: any;
    switch (sort) {
      case UserSortOption.OLDEST:        orderBy = { createdAt: 'asc' };               break;
      case UserSortOption.NAME:          orderBy = { name:      'asc' };               break;
      case UserSortOption.TRUST_SCORE:   orderBy = { trustScore: 'desc' };             break;
      case UserSortOption.LISTING_COUNT: orderBy = { listings: { _count: 'desc' } };   break;
      default:                           orderBy = { createdAt: 'desc' };              break;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id:             true,
          name:           true,
          slug:           true,
          email:          true,
          phone:          true,
          role:           true,
          trustScore:     true,
          isVerified:     true,
          createdAt:      true,
          deletedAt:      true,
          suspendedAt:    true,
          suspendedUntil: true,
          lastLoginAt:    true,
          _count: { select: { listings: true } },
          badges: {
            select: {
              id:         true,
              assignedAt: true,
              expiresAt:  true,
              badge: {
                select: { id: true, name: true, label: true, icon: true, color: true },
              },
            },
          },
          company: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        badges: {
          include: {
            badge:      true,
            assignedBy: { select: { id: true, name: true, email: true } },
          },
        },
        company: true,
        listings: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: {
            images:   { where: { isPrimary: true }, take: 1 },
            category: { select: { id: true, name: true } },
            city:     { select: { id: true, name: true } },
          },
        },
        payments:       { orderBy: { createdAt: 'desc' } },
        moderationLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);

    const [totalListings, activeListings, expiredListings, rejectedListings] =
      await this.prisma.$transaction([
        this.prisma.listing.count({ where: { userId: id } }),
        this.prisma.listing.count({ where: { userId: id, status: ListingStatus.PUBLISHED } }),
        this.prisma.listing.count({ where: { userId: id, status: ListingStatus.EXPIRED } }),
        this.prisma.listing.count({ where: { userId: id, status: ListingStatus.REJECTED } }),
      ]);

    (user as any).moderationLogs = (await this.moderationHistory(id)).data;
    const { passwordHash: _, ...safe } = user as any;
    return { ...safe, totalListings, activeListings, expiredListings, rejectedListings };
  }

  // ─── Slug helper ─────────────────────────────────────────────────────────

  private static readonly ALBANIAN_MAP: Record<string, string> = {
    ë: 'e', Ë: 'e', ç: 'c', Ç: 'c',
    ä: 'a', ö: 'o', ü: 'u', ß: 'ss',
    š: 's', ž: 'z', đ: 'd', ć: 'c', č: 'c',
  };

  private slugify(text: string): string {
    return text
      .split('')
      .map((c) => AdminUsersService.ALBANIAN_MAP[c] ?? c)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async generateUserSlug(name: string): Promise<string> {
    const base = this.slugify(name) || 'user';
    let slug = base;
    let attempt = 0;
    while (await this.prisma.user.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, 12);
    const slug = await this.generateUserSlug(dto.name);

    return this.prisma.user.create({
      data:   { ...rest, passwordHash, slug },
      select: {
        id: true, email: true, name: true, slug: true, phone: true,
        role: true, trustScore: true, isVerified: true, createdAt: true,
      },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // If name changed, regenerate slug
    const data: any = { ...dto };
    if (dto.name && dto.name !== user.name) {
      data.slug = await this.generateUserSlug(dto.name);
    }

    const updated = await this.prisma.user.update({
      where:  { id },
      data,
      select: {
        id: true, email: true, name: true, slug: true, phone: true, role: true,
        trustScore: true, isVerified: true, postingStatus: true, updatedAt: true,
      },
    });

    if (dto.role !== undefined && dto.role !== user.role) {
      await this.logAction({
      subjectUserId: id,
        action:      'admin_role_change',
        reason:      `Role changed from ${user.role} to ${dto.role}`,
        moderatorId: adminId,
      });
    }
    if (dto.trustScore !== undefined && dto.trustScore !== user.trustScore) {
      await this.logAction({
      subjectUserId: id,
        action:      'admin_trust_score_change',
        reason:      `Trust score changed from ${user.trustScore} to ${dto.trustScore}`,
        moderatorId: adminId,
      });
    }
    if (dto.postingStatus !== undefined && dto.postingStatus !== user.postingStatus) {
      await this.logAction({
      subjectUserId: id,
        action:      'admin_posting_status_change',
        reason:      `Posting status changed from ${user.postingStatus} to ${dto.postingStatus}`,
        moderatorId: adminId,
      });
    }

    return updated;
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(id: string, dto: ResetUserPasswordDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash, authVersion: { increment: 1 } } }),
      this.prisma.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    ]);
    await this.logAction({
      subjectUserId: id,
      action:      'admin_password_reset',
      reason:      `Password reset by admin ${adminId}`,
      moderatorId: adminId,
    });

    return { message: 'Password updated and all sessions revoked.' };
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.deletedAt) throw new BadRequestException('User is already deleted');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data:  { deletedAt: new Date(), authVersion: { increment: 1 } },
      }),
      this.prisma.listing.updateMany({
        where: {
          userId: id,
          status: {
            in: [
              ListingStatus.PUBLISHED,
              ListingStatus.PENDING_REVIEW,
              ListingStatus.DRAFT,
            ],
          },
        },
        data: { status: ListingStatus.ARCHIVED },
      }),
    ]);

    await this.logAction({
      subjectUserId: id,
      action:      'admin_user_soft_deleted',
      reason:      `User soft-deleted by admin ${adminId}`,
      moderatorId: adminId,
    });

    return { message: 'User deleted and all active listings archived.' };
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  async restore(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)          throw new NotFoundException(`User ${id} not found`);
    if (!user.deletedAt) throw new BadRequestException('User is not deleted');

    await this.prisma.user.update({ where: { id }, data: { deletedAt: null } });
    await this.logAction({
      subjectUserId: id,
      action:      'admin_user_restored',
      reason:      `User restored by admin ${adminId}`,
      moderatorId: adminId,
    });

    return { message: 'User restored. Listings were not automatically restored.' };
  }

  // ─── Suspend ──────────────────────────────────────────────────────────────

  async suspend(id: string, dto: SuspendUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)           throw new NotFoundException(`User ${id} not found`);
    if (user.suspendedAt) throw new BadRequestException('User is already suspended');

    const suspendedUntil = dto.duration
      ? new Date(Date.now() + dto.duration * 24 * 60 * 60 * 1000)
      : null;

    const suspendedBadge = await this.prisma.badge.findUnique({
      where: { name: 'suspended' },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data:  { suspendedAt: new Date(), suspendedUntil, authVersion: { increment: 1 } },
      });

      if (suspendedBadge) {
        await tx.userBadge.upsert({
          where:  { userId_badgeId: { userId: id, badgeId: suspendedBadge.id } },
          update: {},
          create: { userId: id, badgeId: suspendedBadge.id, assignedById: adminId },
        });
      }

      await tx.listing.updateMany({
        where: {
          userId: id,
          status: { in: [ListingStatus.PUBLISHED, ListingStatus.PENDING_REVIEW] },
        },
        data: { status: ListingStatus.ARCHIVED },
      });
    });

    await this.logAction({
      subjectUserId: id,
      action:      'admin_user_suspended',
      reason:      dto.reason,
      moderatorId: adminId,
    });
    await this.redis.publish(
      'user.suspended',
      JSON.stringify({ userId: id, reason: dto.reason, suspendedUntil }),
    );

    return { message: 'User suspended, listings archived, and sessions revoked.' };
  }

  // ─── Unsuspend ────────────────────────────────────────────────────────────

  async unsuspend(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)            throw new NotFoundException(`User ${id} not found`);
    if (!user.suspendedAt) throw new BadRequestException('User is not suspended');

    const suspendedBadge = await this.prisma.badge.findUnique({
      where: { name: 'suspended' },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data:  { suspendedAt: null, suspendedUntil: null },
      });

      if (suspendedBadge) {
        await tx.userBadge.deleteMany({
          where: { userId: id, badgeId: suspendedBadge.id },
        });
      }
    });

    await this.logAction({
      subjectUserId: id,
      action:      'admin_user_unsuspended',
      reason:      `User unsuspended by admin ${adminId}`,
      moderatorId: adminId,
    });

    return { message: 'User unsuspended. Listings were not automatically restored.' };
  }

  // ─── Assign Badge ─────────────────────────────────────────────────────────

  async assignBadge(userId: string, dto: AssignBadgeDto, adminId: string) {
    const [user, badge] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.badge.findUnique({ where: { name: dto.badgeSlug } }),
    ]);

    if (!user)  throw new NotFoundException(`User ${userId} not found`);
    if (!badge) throw new NotFoundException(`Badge "${dto.badgeSlug}" not found`);

    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (existing) throw new ConflictException('User already has this badge');

    return this.prisma.userBadge.create({
      data: {
        userId,
        badgeId:      badge.id,
        assignedById: adminId,
        expiresAt:    dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { badge: true },
    });
  }

  // ─── Remove Badge ─────────────────────────────────────────────────────────

  async removeBadge(userId: string, badgeSlug: string, adminId: string) {
    const badge = await this.prisma.badge.findUnique({ where: { name: badgeSlug } });
    if (!badge) throw new NotFoundException(`Badge "${badgeSlug}" not found`);

    const userBadge = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (!userBadge) throw new NotFoundException('User does not have this badge');

    await this.prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    await this.logAction({
      subjectUserId: userId,
      action:      'admin_badge_removed',
      reason:      `Badge "${badgeSlug}" removed from user ${userId} by admin ${adminId}`,
      moderatorId: adminId,
    });

    return { message: `Badge "${badgeSlug}" removed.` };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const now        = new Date();
    const weekStart  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, newThisWeek, newThisMonth, suspended, deleted, mostActive] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt:   { gte: weekStart } } }),
        this.prisma.user.count({ where: { createdAt:   { gte: monthStart } } }),
        this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
        this.prisma.user.count({ where: { deletedAt:   { not: null } } }),
        this.prisma.user.findMany({
          orderBy: { listings: { _count: 'desc' } },
          take:    10,
          select: {
            id:    true,
            name:  true,
            email: true,
            _count: { select: { listings: true } },
          },
        }),
      ]);

    // groupBy and aggregate have stricter Prisma typings — run outside batch transaction
    const [byRole, avgScore] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], orderBy: { _count: { role: 'desc' } }, _count: { id: true } }),
      this.prisma.user.aggregate({ _avg: { trustScore: true } }),
    ]);

    return {
      totalUsers,
      newThisWeek,
      newThisMonth,
      suspended,
      deleted,
      byRole: byRole.reduce<Record<string, number>>(
        (acc, r) => { acc[r.role] = r._count.id; return acc; },
        {},
      ),
      avgTrustScore: avgScore._avg.trustScore ?? 0,
      mostActiveUsers: mostActive,
    };
  }
}
