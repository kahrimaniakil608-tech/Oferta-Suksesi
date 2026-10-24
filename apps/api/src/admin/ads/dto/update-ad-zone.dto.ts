import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdPlacement } from '@prisma/client';

export class UpdateAdZoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ enum: AdPlacement })
  @IsOptional()
  @IsEnum(AdPlacement)
  placement?: AdPlacement;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAds?: number;

  @ApiPropertyOptional({ description: 'Rotation interval in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rotationInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
