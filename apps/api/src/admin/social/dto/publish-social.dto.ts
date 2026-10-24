import { IsArray, ArrayNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishSocialDto {
  @ApiProperty({
    description: 'Platforms to publish to',
    example: ['facebook', 'twitter'],
    enum: ['facebook', 'twitter', 'instagram'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['facebook', 'twitter', 'instagram'], { each: true })
  platforms: ('facebook' | 'twitter' | 'instagram')[];
}
