import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: { name: string; filters: Record<string, unknown> }) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: dto.filters as any,
      },
    });
  }

  async update(id: string, userId: string, dto: { name?: string; filters?: Record<string, unknown>; isActive?: boolean }) {
    const saved = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!saved || saved.userId !== userId) throw new NotFoundException('Saved search not found');

    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.filters !== undefined && { filters: dto.filters as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const saved = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!saved || saved.userId !== userId) throw new NotFoundException('Saved search not found');

    await this.prisma.savedSearch.delete({ where: { id } });
    return { deleted: true };
  }
}
