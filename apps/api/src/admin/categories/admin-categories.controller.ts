import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { AdminCategoriesService } from './admin-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin / categories')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(private readonly service: AdminCategoriesService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all categories (tree with listing counts)' })
  findAll() {
    return this.service.findAll();
  }

  // ─── Reorder — static route before /:id ───────────────────────────────────

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder top-level categories', description: 'Pass ordered array of category IDs.' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  reorder(@Body('ids') ids: number[]) {
    return this.service.reorder(ids);
  }

  // ─── Single ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOperation({ summary: 'Get category by ID with children' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create category or subcategory' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update category fields' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  // ─── Toggle active ────────────────────────────────────────────────────────

  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle isActive for category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleActive(id);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category (blocked if has listings or children)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 400, description: 'Has listings or children' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
