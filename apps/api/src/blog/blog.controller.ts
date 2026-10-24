import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateCategoryDto {
  @IsString() @MinLength(2)  name!: string;
  @IsString() @MinLength(2)  slug!: string;
  @IsString() @IsOptional()  description?: string;
  @IsInt()    @IsOptional()  position?: number;
}

class UpdateCategoryDto {
  @IsString() @IsOptional() @MinLength(2)  name?: string;
  @IsString() @IsOptional() @MinLength(2)  slug?: string;
  @IsString() @IsOptional()                description?: string;
  @IsInt()    @IsOptional()                position?: number;
}

class CreatePostDto {
  @IsInt()                   categoryId!: number;
  @IsString() @MinLength(2)  title!: string;
  @IsString() @MinLength(2)  slug!: string;
  @IsString() @IsOptional()  excerpt?: string;
  @IsString()                content!: string;
  @IsString() @IsOptional()  featureImage?: string;
  @IsBoolean() @IsOptional() isPublished?: boolean;
  @IsString() @IsOptional()  metaDesc?: string;
}

class UpdatePostDto {
  @IsInt()    @IsOptional()                categoryId?: number;
  @IsString() @IsOptional() @MinLength(2)  title?: string;
  @IsString() @IsOptional() @MinLength(2)  slug?: string;
  @IsString() @IsOptional()                excerpt?: string;
  @IsString() @IsOptional()                content?: string;
  @IsString() @IsOptional()                featureImage?: string;
  @IsBoolean() @IsOptional()               isPublished?: boolean;
  @IsString() @IsOptional()                metaDesc?: string;
}

// ─── Blog Categories Controller ────────────────────────────────────────────────

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Categories ──────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all blog categories' })
  @ApiOkResponse({ description: 'Category list' })
  getCategories() {
    return this.prisma.blogCategory.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: { where: { isPublished: true } } } } },
    });
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog category (admin)' })
  @ApiCreatedResponse({ description: 'Category created' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.prisma.blogCategory.create({ data: dto });
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog category (admin)' })
  @ApiOkResponse({ description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.blogCategory.update({ where: { id: Number(id) }, data: dto });
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete blog category (admin)' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.blogCategory.delete({ where: { id: Number(id) } });
  }

  // ── Posts ────────────────────────────────────────────────────────────────────

  @Get('posts/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all posts including drafts (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAdminPosts(
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('published') published?: string,
  ) {
    if (published && !['true','false'].includes(published)) throw new BadRequestException('Invalid published filter');
    const where = { ...(search?.trim() ? { title: { contains: search.trim().slice(0,200), mode: 'insensitive' as const } } : {}), ...(published ? { isPublished: published === 'true' } : {}) };
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where, skip,
        take: Number(limit),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          author:   { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.blogPost.count({where}),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Get('posts')
  @ApiOperation({ summary: 'List published posts (public)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page',     required: false })
  @ApiQuery({ name: 'limit',    required: false })
  async getPosts(
    @Query('category') category?: string,
    @Query('page')     page      = 1,
    @Query('limit')    limit     = 12,
  ) {
    const where: Record<string, unknown> = { isPublished: true };
    if (category) {
      where.category = { slug: category };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        select: {
          id:           true,
          title:        true,
          slug:         true,
          excerpt:      true,
          featureImage: true,
          publishedAt:  true,
          createdAt:    true, updatedAt: true,
          category:     { select: { id: true, name: true, slug: true } },
          author:       { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Get('posts/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getAdminPost(@Param('id') id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, include: { category: true, author: { select: { id: true, name: true } } } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Get single published post by slug (public)' })
  @ApiOkResponse({ description: 'Post found' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async getPost(@Param('slug') slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author:   { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog post (admin)' })
  @ApiCreatedResponse({ description: 'Post created' })
  createPost(@Body() dto: CreatePostDto, @Request() req: { user: { id: string } }) {
    const { categoryId, isPublished, ...rest } = dto;
    return this.prisma.blogPost.create({
      data: {
        ...rest,
        category:    { connect: { id: categoryId } },
        author:      { connect: { id: req.user.id } },
        isPublished: isPublished ?? false,
        publishedAt: isPublished ? new Date() : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author:   { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog post (admin)' })
  @ApiOkResponse({ description: 'Post updated' })
  async updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    const { categoryId, isPublished, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (categoryId !== undefined) {
      data.category = { connect: { id: categoryId } };
    }
    if (isPublished !== undefined) {
      data.isPublished = isPublished;
      if (isPublished && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.blogPost.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author:   { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete blog post (admin)' })
  @ApiNoContentResponse({ description: 'Post deleted' })
  async deletePost(@Param('id') id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.delete({ where: { id } });
  }
}
