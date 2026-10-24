import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkListingAction {
  APPROVE   = 'approve',
  REJECT    = 'reject',
  DELETE    = 'delete',
  FEATURE   = 'feature',
  UNFEATURE = 'unfeature',
  ARCHIVE          = 'archive',
  RENEW            = 'renew',
  PERMANENT_DELETE = 'permanent_delete',
}

export class BulkActionDto {
  @ApiProperty({ type: [String], description: 'Array of listing IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  listingIds: string[];

  @ApiProperty({ enum: BulkListingAction })
  @IsEnum(BulkListingAction)
  action: BulkListingAction;

  @ApiPropertyOptional({ description: 'Required for reject action' })
  @IsOptional()
  @IsString()
  reason?: string;
}
