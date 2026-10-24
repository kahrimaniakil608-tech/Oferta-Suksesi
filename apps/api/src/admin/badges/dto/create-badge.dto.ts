import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateBadgeDto {
  @ApiProperty({ description: 'Unique system name (slug)', example: 'verified_user' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, { message: 'Name must be lowercase letters, numbers, and underscores only' })
  name: string;

  @ApiProperty({ description: 'Public display label', example: 'Përdorues i Verifikuar' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Badge description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Emoji icon', example: '⭐' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ description: 'Hex color code', example: '#1B5E3B' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiPropertyOptional({ description: 'Whether badge is automatically assigned', default: false })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional({ description: 'Auto-assignment criteria (JSON)', example: { minListings: 10 } })
  @IsOptional()
  @IsObject()
  criteria?: Record<string, unknown>;
}
