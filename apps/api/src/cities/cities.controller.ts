import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'All cities ordered by name' })
  @ApiOkResponse({ description: 'City list' })
  findAll() {
    return this.prisma.city.findMany({
      select: { id: true, name: true, slug: true, region: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single city by slug' })
  @ApiOkResponse({ description: 'City details' })
  @ApiNotFoundResponse({ description: 'City not found' })
  async findBySlug(@Param('slug') slug: string) {
    const city = await this.prisma.city.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, region: true, latitude: true, longitude: true },
    });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }
}
