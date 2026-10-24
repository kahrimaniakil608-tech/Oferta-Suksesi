import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'All top-level categories with their subcategories' })
  @ApiOkResponse({ description: 'Category list' })
  findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        attributeSchema: true,
        children: {
          select: { id: true, name: true, slug: true, icon: true, attributeSchema: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }
}
