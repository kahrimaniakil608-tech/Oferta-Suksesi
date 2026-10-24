import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class ReportListingDto {
  @ApiProperty({ example: 'spam' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional({ example: 'This listing is a duplicate' })
  @IsOptional()
  @IsString()
  details?: string;
}
