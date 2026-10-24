import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ListingStatus } from '@prisma/client';

export enum SortOption {
  NEWEST    = 'newest',
  OLDEST    = 'oldest',
  PRICE_ASC  = 'price_asc',
  PRICE_DESC = 'price_desc',
  VIEWS     = 'views',
}

export class ListingQueryDto {
  @ApiPropertyOptional({ example: 'banesa' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'shtepi-ne-shitje' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ example: 'prishtine' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ListingStatus })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  has_photos?: boolean;

  @ApiPropertyOptional({ example: 'banesa prishtine' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: SortOption, default: SortOption.NEWEST })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.NEWEST;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
