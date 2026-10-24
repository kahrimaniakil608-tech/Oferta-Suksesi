import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContactType } from '@prisma/client';

export class ContactListingDto {
  @ApiProperty({ enum: ContactType, example: ContactType.PHONE })
  @IsEnum(ContactType)
  contactType: ContactType;
}
