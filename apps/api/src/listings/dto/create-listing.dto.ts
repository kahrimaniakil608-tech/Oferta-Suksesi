import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ArrayMaxSize,
  IsDateString,
  MinLength,
  MaxLength,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListingImageDto {
  @IsOptional() @IsString() claimToken?: string;
  @IsString() url!: string;
  @IsString() thumbUrl!: string;
  @IsString() mediumUrl!: string;
}

export class CreateListingDto {
  @IsOptional() @IsUUID() requestId?: string;
  @ApiProperty({ example: 'Shitet banesa 3+1 në Prishtinë' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Banesa ndodhet në lagjen Dardania...' })
  @IsString()
  @MinLength(20)
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
  subcategoryId?: number | null;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  cityId: number;

  @ApiPropertyOptional({ example: { price: 85000, rooms: 3, floor: 4 } })
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

  @ApiPropertyOptional({ description: 'Images pre-uploaded to the image service', type: [ListingImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images?: ListingImageDto[];
}
