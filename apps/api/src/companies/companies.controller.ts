import { attachAsset } from '../media/asset-ownership';
import { serializableTransaction } from '../prisma/serializable-transaction';
import { BadRequestException } from '@nestjs/common';
import { publicListingWhere } from '../listings/listing-visibility';
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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  OmitType,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

class CreateCompanyDto {
  @IsString() @MinLength(2)  name!: string;
  @IsString() @MinLength(2)  slug!: string;
  @IsString() @IsOptional()  description?: string;
  @IsString()                phone!: string;
  @IsEmail()                 email!: string;
  @IsString() @IsOptional()  website?: string;
  @IsString() @IsOptional()  address?: string;
}

class AdminCreateCompanyDto {
  @IsString() @MinLength(2)  name!: string;
  @IsString() @MinLength(2)  slug!: string;
  @IsString()                ownerId!: string;
  @IsString() @IsOptional()  description?: string;
  @IsString()                phone!: string;
  @IsEmail()                 email!: string;
  @IsString() @IsOptional()  website?: string;
  @IsString() @IsOptional()  address?: string;
  @IsString() @IsOptional()  logoUrl?: string;
  @IsString() @IsOptional()  coverUrl?: string;
  @IsObject() @IsOptional()  socials?: Record<string, string>;
}

class UpdateCompanyDto {
  @IsString() @IsOptional()  name?: string;
  @IsString() @IsOptional()  slug?: string;
  @IsString() @IsOptional()  description?: string;
  @IsString() @IsOptional()  phone?: string;
  @IsEmail()   @IsOptional() email?: string;
  @IsString() @IsOptional()  website?: string;
  @IsString() @IsOptional()  address?: string;
  @IsString() @IsOptional()  logoUrl?: string;
  @IsString() @IsOptional()  coverUrl?: string;
  @IsObject() @IsOptional()  socials?: Record<string, string>;
  @IsString() @IsOptional()  ownerId?: string;
}

class OwnerUpdateCompanyDto extends OmitType(UpdateCompanyDto, ['ownerId'] as const) {}

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public: List companies ────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List companies (optionally filter by premium)' })
  @ApiOkResponse({ description: 'Array of companies' })
  async findAll(
    @Query('premium') premium?: string,
    @Query('limit')   limit = '12',
    @Query('page') page?: string,
    @Query('q') q?: string,
  ) {
    const where = { ...(premium === 'true' ? { isPremium: true } : {}), ...(q?.trim() && { OR: ['name','slug','email'].map(field => ({ [field]: { contains: q.trim().slice(0,200), mode: 'insensitive' as const } })) }) };
    const size = Math.min(Number(limit), 100);
    const index = Number(page ?? 1);
    const [data, total] = await this.prisma.$transaction([this.prisma.company.findMany({
      where,
      select: {
        id: true, name: true, slug: true, logoUrl: true, coverUrl: true,
        updatedAt: true, description: true, phone: true, email: true, website: true,
        address: true, socials: true, isVerified: true, isPremium: true,
        owner: { select: { id: true, name: true, email: true } },
        city: { select: { name: true } },
        _count: { select: { listings: { where: publicListingWhere() }, users: true } },
      },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: size, skip: (index-1)*size,
    }), this.prisma.company.count({ where })]);
    return page === undefined ? data : { data, meta: { total, page: index, limit: size, totalPages: Math.ceil(total/size) } };
  }

  // ─── Public: Get company by slug ──────────────────────────────────────────

  @Get(':slug')
  @ApiOperation({ summary: 'Get company profile by slug' })
  async findOne(
    @Param('slug') slug: string,
    @Query('page') page = '1',
  ) {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, name: true, createdAt: true } },
        city:  { select: { id: true, name: true } },
      },
    });
    if (!company) throw new NotFoundException('Kompania nuk u gjet');

    const skip = (parseInt(page) - 1) * 20;
    const [listings, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where: { ...publicListingWhere(), companyId: company.id },
        include: {
          category: { select: { id: true, name: true } },
          city:     { select: { id: true, name: true } },
          images:   { where: { isPrimary: true }, take: 1 },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: 20,
      }),
      this.prisma.listing.count({ where: { ...publicListingWhere(), companyId: company.id } }),
    ]);

    return {
      ...company,
      listings,
      meta: { total, page: parseInt(page), totalPages: Math.ceil(total / 20) },
    };
  }

  // ─── Authenticated: Create company ────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company profile' })
  async create(@Req() req: Request, @Body() dto: CreateCompanyDto) {
    return serializableTransaction(this.prisma, async tx => {
    const userId = (req.user as any).id;
    const existing = await tx.company.findUnique({ where: { ownerId: userId } });
    if (existing) throw new NotFoundException('Ju tashmë keni një kompani');

    const company = await tx.company.create({
      data: { ...dto, ownerId: userId },
    });

    await tx.user.update({
      where: { id: userId },
      data: { companyId: company.id },
    });

    return company;
    });
  }

  // ─── Authenticated: Update own company ───────────────────────────────────

  @Patch('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own company profile' })
  async updateMine(@Req() req: Request, @Body() dto: OwnerUpdateCompanyDto) {
    return serializableTransaction(this.prisma, async tx => {
    const userId = (req.user as any).id;
    const company = await tx.company.findUnique({ where: { ownerId: userId } });
    if (!company) throw new NotFoundException('Kompania nuk u gjet');
    await attachAsset(tx, dto.logoUrl, company.logoUrl, userId, 'company-logo');
    await attachAsset(tx, dto.coverUrl, company.coverUrl, userId, 'company-cover');
    return tx.company.update({ where: { id: company.id }, data: {
      name: dto.name, slug: dto.slug, description: dto.description, phone: dto.phone,
      email: dto.email, website: dto.website, address: dto.address, logoUrl: dto.logoUrl,
      coverUrl: dto.coverUrl, socials: dto.socials,
    } });
    });
  }

  // ─── Admin: verify / toggle premium ──────────────────────────────────────

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle company verified status (admin)' })
  async verify(@Param('id') id: string, @Body() body: { isVerified: boolean }) {
    return this.prisma.company.update({
      where: { id },
      data: { isVerified: body.isVerified },
    });
  }

  @Patch(':id/premium')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle company premium status (admin)' })
  async premium(@Param('id') id: string, @Body() body: { isPremium: boolean }) {
    return this.prisma.company.update({
      where: { id },
      data: { isPremium: body.isPremium },
    });
  }

  // ─── Admin: create company manually ───────────────────────────────────────

  @Post('admin-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin creates company and assigns owner' })
  async adminCreate(@Body() dto: AdminCreateCompanyDto, @Req() req: Request) {
    return serializableTransaction(this.prisma, async tx => {
    const { ownerId, ...rest } = dto;

    const owner = await tx.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Përdoruesi nuk u gjet');

    const existing = await tx.company.findUnique({ where: { ownerId } });
    if (existing) throw new NotFoundException('Ky përdorues tashmë ka një kompani');

    if (owner.deletedAt || owner.suspendedAt) throw new BadRequestException('Owner is unavailable');
    await attachAsset(tx, dto.logoUrl, null, (req.user as any).id, 'company-logo');
    await attachAsset(tx, dto.coverUrl, null, (req.user as any).id, 'company-cover');
    const company = await tx.company.create({
      data: { ...rest, ownerId },
    });

    await tx.user.update({
      where: { id: ownerId },
      data: { companyId: company.id },
    });

    return company;
    });
  }

  // ─── Admin: update company ───────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin update company' })
  async adminUpdate(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Req() req: Request) {
    return serializableTransaction(this.prisma, async tx => {
    const company = await tx.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Kompania nuk u gjet');

    await attachAsset(tx, dto.logoUrl, company.logoUrl, (req.user as any).id, 'company-logo');
    await attachAsset(tx, dto.coverUrl, company.coverUrl, (req.user as any).id, 'company-cover');
    const { ownerId, ...rest } = dto;

    if (ownerId && ownerId !== company.ownerId) {
      const newOwner = await tx.user.findUnique({ where: { id: ownerId } });
      if (!newOwner) throw new NotFoundException('Përdoruesi nuk u gjet');

      if (newOwner.deletedAt || newOwner.suspendedAt || await tx.company.findUnique({ where: { ownerId } })) throw new BadRequestException('Owner is unavailable or already owns a company');
      // Clear previous membership
      await tx.user.update({
        where: { id: company.ownerId },
        data: { companyId: null },
      });

      // Assign new owner
      await tx.user.update({
        where: { id: ownerId },
        data: { companyId: id },
      });

      return tx.company.update({
        where: { id },
        data: { ...rest, ownerId },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
    }

    return tx.company.update({
      where: { id },
      data: rest,
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    });
  }

  // ─── Admin: delete company ──────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin delete company' })
  async adminDelete(@Param('id') id: string) {
    return serializableTransaction(this.prisma, async tx => {
    const company = await tx.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Kompania nuk u gjet');

    // Remove company association from all users
    await tx.user.updateMany({
      where: { companyId: id },
      data: { companyId: null },
    });

    await tx.listing.updateMany({ where: { companyId: id }, data: { companyId: null } });
    // Clear owner membership
    await tx.user.update({
      where: { id: company.ownerId },
      data: { companyId: null },
    });

    await tx.company.delete({ where: { id } });

    return { ok: true };
    });
  }

  // ─── Admin: assign user to company ───────────────────────────────────────

  @Patch(':id/assign-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a user to a company (admin)' })
  async assignUser(@Param('id') id: string, @Body() body: { userId: string }) {
    return serializableTransaction(this.prisma, async tx => {
    const company = await tx.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Kompania nuk u gjet');

    const user = await tx.user.findUnique({ where: { id: body.userId } });
    if (!user) throw new NotFoundException('Përdoruesi nuk u gjet');

    const owned = await tx.company.findUnique({ where: { ownerId: body.userId } });
    if (owned && owned.id !== id) throw new BadRequestException('A company owner must remain in their own company');
    await tx.user.update({
      where: { id: body.userId },
      data: { companyId: id },
    });

    return { ok: true };
    });
  }
}
