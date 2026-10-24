import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ZoneContextDto {
  @ApiPropertyOptional({ description: 'Category ID of the current page (for targeting)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'City ID of the current page (for targeting)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cityId?: number;
}
