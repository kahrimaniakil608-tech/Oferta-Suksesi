import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdType } from '@prisma/client';

export class UpdateAdDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ enum: AdType })
  @IsOptional()
  @IsEnum(AdType)
  adType?: AdType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  advertiserName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Raw HTML/JS embed code (e.g. Google AdSense)' })
  @IsOptional()
  @IsString()
  embedCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Replace category targets. Pass empty array to clear (show everywhere).',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Replace city targets. Pass empty array to clear (show everywhere).',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  cityIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
