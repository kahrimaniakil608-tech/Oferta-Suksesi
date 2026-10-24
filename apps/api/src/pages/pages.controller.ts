import {
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

class UpsertPageDto {
  @IsString() @MinLength(2)  slug!: string;
  @IsString() @MinLength(2)  title!: string;
  @IsString()                content!: string;
  @IsString() @IsOptional()  metaDesc?: string;
  @IsBoolean() @IsOptional() isPublished?: boolean;
}

class UpdatePageDto {
  @IsString() @IsOptional() @MinLength(2)  slug?: string;
  @IsString() @IsOptional() @MinLength(2)  title?: string;
  @IsString() @IsOptional()                content?: string;
  @IsString() @IsOptional()                metaDesc?: string;
  @IsBoolean() @IsOptional()               isPublished?: boolean;
}

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'All pages' })
  @ApiOkResponse({ description: 'Page list' })
  findAll() {
    return this.prisma.page.findMany({ where: { isPublished: true }, orderBy: { title: 'asc' } });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get page by slug' })
  @ApiOkResponse({ description: 'Page found' })
  @ApiNotFoundResponse({ description: 'Page not found' })
  async findOne(@Param('slug') slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.isPublished) throw new NotFoundException('Page not found');
    return page;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create page (admin)' })
  @ApiCreatedResponse({ description: 'Page created' })
  create(@Body() dto: UpsertPageDto) {
    return this.prisma.page.create({ data: dto });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update page (admin)' })
  @ApiOkResponse({ description: 'Page updated' })
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');
    return this.prisma.page.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete page (admin only)' })
  @ApiNoContentResponse({ description: 'Page deleted' })
  async remove(@Param('id') id: string) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');
    await this.prisma.page.delete({ where: { id } });
  }
}
