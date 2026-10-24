import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectListingDto {
  @ApiProperty({
    description: 'Rejection reason',
    example: 'Spam',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
