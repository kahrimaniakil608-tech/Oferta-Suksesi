import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name (Albanian)', example: 'Patunësi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL slug', example: 'patunesi' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ApiPropertyOptional({ description: 'Emoji icon', example: '🏠' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Parent category ID (for subcategories)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Sort position (lower = first)', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Whether the category is visible', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
