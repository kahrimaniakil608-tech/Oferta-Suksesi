import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateAdDto {
  @ApiProperty({ example: '2026-06-01T00:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-07-01T00:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Override title for the duplicate' })
  @IsOptional()
  @IsString()
  title?: string;
}
