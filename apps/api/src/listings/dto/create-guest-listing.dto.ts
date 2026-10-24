import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ArrayMaxSize,
  IsEmail,
  MinLength,
  MaxLength,
  IsPositive,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingImageDto } from './create-listing.dto';

export class CreateGuestListingDto {
  @IsOptional() @IsUUID() requestId?: string;
  @ApiProperty({ example: 'Shitet banesa 2+1 në Prizren' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Banesa ndodhet në qendër të qytetit...' })
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  subcategoryId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  cityId: number;

  @ApiPropertyOptional({ example: { price: 45000, rooms: 2 } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // ─── Guest identity ────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Filan Fisteku' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestName?: string;

  @ApiPropertyOptional({ example: '+383 44 123 456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'filan@email.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Images pre-uploaded to the image service', type: [ListingImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ListingImageDto)
  images?: ListingImageDto[];
}
