import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ListingAdminSortOption {
  NEWEST    = 'newest',
  OLDEST    = 'oldest',
  VIEWS     = 'views',
  CONTACTS  = 'contacts',
  SPAM_SCORE = 'spamScore',
}

export class ListAdminListingsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Single status or comma-separated list: DRAFT,PENDING_REVIEW,PUBLISHED,REJECTED,EXPIRED,ARCHIVED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'City slug' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by userId' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by companyId' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ description: 'Only listings that have at least one image' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasImages?: boolean;

  @ApiPropertyOptional({ enum: ListingAdminSortOption, default: ListingAdminSortOption.NEWEST })
  @IsOptional()
  @IsEnum(ListingAdminSortOption)
  sort?: ListingAdminSortOption = ListingAdminSortOption.NEWEST;

  @ApiPropertyOptional({ description: 'ISO date string — filter createdAt >= dateFrom' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date string — filter createdAt <= dateTo' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted listings (deletedAt != null)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDeleted?: boolean;
}
