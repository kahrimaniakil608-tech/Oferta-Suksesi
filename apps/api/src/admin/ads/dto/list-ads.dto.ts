import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AdStatusFilter {
  ACTIVE    = 'active',
  SCHEDULED = 'scheduled',
  EXPIRED   = 'expired',
  PAUSED    = 'paused',
}

export class ListAdsDto {
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

  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ enum: AdStatusFilter, description: 'active | scheduled | expired | paused' })
  @IsOptional()
  @IsEnum(AdStatusFilter)
  status?: AdStatusFilter;

  @ApiPropertyOptional({ description: 'Search in advertiserName and title' })
  @IsOptional()
  @IsString()
  search?: string;
}
