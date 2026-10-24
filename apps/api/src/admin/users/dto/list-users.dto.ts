import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export enum UserSortOption {
  NEWEST       = 'newest',
  OLDEST       = 'oldest',
  NAME         = 'name',
  TRUST_SCORE  = 'trustScore',
  LISTING_COUNT = 'listingCount',
}

export class ListUsersDto {
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() deleted?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserSortOption, default: UserSortOption.NEWEST })
  @IsOptional()
  @IsEnum(UserSortOption)
  sort?: UserSortOption = UserSortOption.NEWEST;

  @ApiPropertyOptional({ description: 'Filter to users who have this badge (by badge name/slug)' })
  @IsOptional()
  @IsString()
  hasBadge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trustScoreMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trustScoreMax?: number;
}
