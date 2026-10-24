import { serializableTransaction } from '../../prisma/serializable-transaction';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List all ────────────────────────────────────────────────────────────────

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where:   { parentId: null },
      include: {
        children: {
          include: { _count: { select: { listings: true } } },
          orderBy: { position: 'asc' },
        },
        _count: { select: { listings: true } },
      },
      orderBy: { position: 'asc' },
    });
    return categories;
  }

  // ─── Single ───────────────────────────────────────────────────────────────

  async findOne(id: number) {
    const cat = await this.prisma.category.findUnique({
      where:   { id },
      include: {
        children: { include: { _count: { select: { listings: true } } }, orderBy: { position: 'asc' } },
        _count:   { select: { listings: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    return serializableTransaction(this.prisma, async tx => {
    // Ensure slug is unique
    const existing = await tx.category.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);

    // Validate parent exists
    if (dto.parentId) {
      const parent = await tx.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId !== null) throw new BadRequestException('Subcategories cannot have children');
    }

    return tx.category.create({
      data: {
        name:     dto.name,
        slug:     dto.slug,
        icon:     dto.icon,
        parentId: dto.parentId,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateCategoryDto) {
    return serializableTransaction(this.prisma, async tx => {
    const current = await tx.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Category not found');
    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      if (dto.parentId === id) throw new BadRequestException('A category cannot be its own parent');
      if (dto.parentId !== null) {
        const parent = await tx.category.findUnique({ where: { id: dto.parentId } });
        if (!parent) throw new NotFoundException('Parent category not found');
        if (parent.parentId !== null || await tx.category.count({ where: { parentId: id } })) throw new BadRequestException('Only two category levels are supported');
      }
      if (await tx.listing.count({ where: { OR: [{ categoryId: id }, { subcategoryId: id }] } })) throw new BadRequestException('Move existing listings before changing this category parent');
    }

    if (dto.slug) {
      const existing = await tx.category.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    return tx.category.update({
      where: { id },
      data: {
        ...(dto.name     !== undefined && { name:     dto.name }),
        ...(dto.slug     !== undefined && { slug:     dto.slug }),
        ...(dto.icon     !== undefined && { icon:     dto.icon }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: { _count: { select: { listings: true } } },
    });
    });
  }

  // ─── Toggle active ────────────────────────────────────────────────────────

  async toggleActive(id: number) {
    const cat = await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data:  { isActive: !cat.isActive },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: number) {
    return serializableTransaction(this.prisma, async tx => {
    const cat = await tx.category.findUnique({ where: { id }, include: { children: true, _count: { select: { listings: true, sublistings: true } } } });
    if (!cat) throw new NotFoundException('Category not found');

    // Block if any listings reference this category
    if (cat._count.listings + cat._count.sublistings > 0) {
      throw new BadRequestException(
        `Cannot delete category — it has ${cat._count.listings} listing(s). Archive or move them first.`,
      );
    }

    // Block if has children
    if (cat.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete category — it has ${cat.children.length} subcategorie(s). Delete them first.`,
      );
    }

    return tx.category.delete({ where: { id } });
    });
  }

  // ─── Reorder ──────────────────────────────────────────────────────────────

  async reorder(ids: number[]) {
    return serializableTransaction(this.prisma, async tx => {
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate categories');
    await Promise.all(
      ids.map((id, index) =>
        tx.category.update({ where: { id }, data: { position: index } }),
      ),
    );
    return { reordered: ids.length };
    });
  }
}
