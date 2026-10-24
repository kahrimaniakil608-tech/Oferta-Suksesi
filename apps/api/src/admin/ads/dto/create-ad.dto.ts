import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdType } from '@prisma/client';

export class CreateAdDto {
  @ApiProperty({ description: 'AdZone ID' })
  @IsString()
  zoneId: string;

  @ApiPropertyOptional({ enum: AdType, default: AdType.IMAGE_BANNER })
  @IsOptional()
  @IsIn([AdType.IMAGE_BANNER], { message: 'Only image banners are supported; provider embeds require a reviewed CSP integration' })
  adType?: AdType;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  advertiserName: string;

  @ApiProperty({ example: 'Summer Sale 50% Off' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Image URL (upload separately via media endpoint)' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Reserved for a future reviewed provider integration; not accepted for serving.' })
  @IsOptional()
  @IsString()
  embedCode?: string;

  @ApiProperty({ example: 'https://example.com/landing' })
  @IsUrl()
  targetUrl: string;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ default: 0, description: 'Higher = shown first' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Target category IDs. Empty array or omit = show in all categories.',
    type: [Number],
    example: [1, 5],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Target city IDs. Empty array or omit = show in all cities.',
    type: [Number],
    example: [2, 7],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cityIds?: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
