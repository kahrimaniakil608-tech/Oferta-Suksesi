import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  IsPositive,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListingImageDto {
  @IsString() url!: string;
  @IsString() thumbUrl!: string;
  @IsString() mediumUrl!: string;
}

export enum ListingSource {
  WHATSAPP = 'WHATSAPP',
  VIBER    = 'VIBER',
  SMS      = 'SMS',
  FACEBOOK = 'FACEBOOK',
  PHONE    = 'PHONE',
  OTHER    = 'OTHER',
}

export class CreateAdminListingDto {
  @ApiProperty({ example: 'Shitet banesa 3+1 në Prishtinë' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Banesa ndodhet në lagjen Dardania...' })
  @IsString()
  @MinLength(5)
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  subcategoryId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  cityId: number;

  @ApiPropertyOptional({ example: { price: 85000, rooms: 3 } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ example: 'comp-id-123' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: 'Existing user ID to assign the listing to' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Contact phone override', example: '+383 44 123 456' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Image URLs (url used as thumb and medium as well)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'Processed images with separate url/thumbUrl/mediumUrl', type: [ListingImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images?: ListingImageDto[];

  @ApiProperty({ enum: ListingSource, description: 'Source channel through which the listing was received' })
  @IsEnum(ListingSource)
  source: ListingSource;

  @ApiPropertyOptional({ example: 'Customer said urgently selling, price negotiable' })
  @IsOptional()
  @IsString()
  notes?: string;
}
