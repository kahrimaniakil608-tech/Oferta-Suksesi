import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignBadgeDto {
  @ApiProperty({
    description: 'Badge name/slug (e.g. "verified", "trusted_seller")',
    example: 'trusted_seller',
  })
  @IsString()
  badgeSlug: string;

  @ApiPropertyOptional({
    description: 'ISO date string when the badge expires. Omit for permanent.',
    example: '2027-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
