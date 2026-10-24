import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackImpressionDto {
  @ApiPropertyOptional({ example: '/listings?category=electronics' })
  @IsOptional()
  @IsString()
  pageUrl?: string;
}
