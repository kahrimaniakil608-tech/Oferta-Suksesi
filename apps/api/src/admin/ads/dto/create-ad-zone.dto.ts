import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdPlacement } from '@prisma/client';

export class CreateAdZoneDto {
  @ApiProperty({ example: 'Header Banner' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'header-banner' })
  @IsString()
  slug: string;

  @ApiProperty({ enum: AdPlacement })
  @IsEnum(AdPlacement)
  placement: AdPlacement;

  @ApiProperty({ example: 728 })
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(1)
  height: number;

  @ApiPropertyOptional({ example: 5, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAds?: number;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Rotation interval in seconds (how often ads cycle)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rotationInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
