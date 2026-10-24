import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';

@Injectable()
export class AdminBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List all badges ─────────────────────────────────────────────────────────

  async findAll() {
    const badges = await this.prisma.badge.findMany({
      include: { _count: { select: { userBadges: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Frontend expects _count.users, not _count.userBadges
    return {
      data: badges.map((b) => ({
        ...b,
        _count: { users: b._count.userBadges },
      })),
    };
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateBadgeDto) {
    const existing = await this.prisma.badge.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Badge "${dto.name}" already exists`);

    return this.prisma.badge.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        isAutomatic: dto.isAutomatic ?? false,
        criteria: (dto.criteria ?? {}) as InputJsonValue,
      },
    });
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateBadgeDto) {
    const badge = await this.prisma.badge.findUnique({ where: { id } });
    if (!badge) throw new NotFoundException('Badge not found');

    if (dto.name && dto.name !== badge.name) {
      const existing = await this.prisma.badge.findUnique({ where: { name: dto.name } });
      if (existing) throw new ConflictException(`Badge "${dto.name}" already exists`);
    }

    return this.prisma.badge.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.isAutomatic !== undefined && { isAutomatic: dto.isAutomatic }),
        ...(dto.criteria !== undefined && { criteria: dto.criteria as InputJsonValue }),
      },
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string) {
    const badge = await this.prisma.badge.findUnique({ where: { id } });
    if (!badge) throw new NotFoundException('Badge not found');

    return this.prisma.badge.delete({ where: { id } });
  }

  // ─── Get users with a badge ──────────────────────────────────────────────────

  async getBadgeUsers(badgeId: string) {
    const badge = await this.prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new NotFoundException('Badge not found');

    const userBadges = await this.prisma.userBadge.findMany({
      where: { badgeId },
      select: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return { data: userBadges.map((ub) => ub.user) };
  }

  // ─── Remove badge from user ──────────────────────────────────────────────────

  async removeUserBadge(badgeId: string, userId: string) {
    const result = await this.prisma.userBadge.deleteMany({
      where: { badgeId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('User does not have this badge');
    }

    return { removed: true };
  }
}
