import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class AdminCitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.city.findMany({
      include: { _count: { select: { listings: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Single ───────────────────────────────────────────────────────────────

  async findOne(id: number) {
    const city = await this.prisma.city.findUnique({
      where:   { id },
      include: { _count: { select: { listings: true } } },
    });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);

    return this.prisma.city.create({
      data: {
        name:      dto.name,
        slug:      dto.slug,
        region:    dto.region,
        latitude:  dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateCityDto) {
    await this.findOne(id);

    if (dto.slug) {
      const conflict = await this.prisma.city.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    return this.prisma.city.update({
      where: { id },
      data: {
        ...(dto.name      !== undefined && { name:      dto.name }),
        ...(dto.slug      !== undefined && { slug:      dto.slug }),
        ...(dto.region    !== undefined && { region:    dto.region }),
        ...(dto.latitude  !== undefined && { latitude:  dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      },
      include: { _count: { select: { listings: true } } },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: number) {
    const city = await this.findOne(id);

    if (city._count.listings > 0) {
      throw new BadRequestException(
        `Cannot delete city — it has ${city._count.listings} listing(s). Reassign them first.`,
      );
    }

    return this.prisma.city.delete({ where: { id } });
  }
}
