import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SuspendUserDto {
  @ApiProperty({ description: 'Reason for suspension', example: 'Spam activity detected' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Duration in days. Omit or set to null for permanent suspension.',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
}
