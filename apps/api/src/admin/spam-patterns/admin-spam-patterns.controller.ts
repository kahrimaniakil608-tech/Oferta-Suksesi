import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role, SpamPatternType } from '@prisma/client';
import { AdminSpamPatternsService } from './admin-spam-patterns.service';

@ApiTags('admin/spam-patterns')
@Controller('admin/spam-patterns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminSpamPatternsController {
  constructor(private readonly spamService: AdminSpamPatternsService) {}

  @Get()
  @ApiOperation({ summary: 'List all spam patterns' })
  async findAll() {
    return this.spamService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a spam pattern' })
  async create(@Body() dto: { pattern: string; type: SpamPatternType; severity?: number }) {
    return this.spamService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a spam pattern' })
  async update(
    @Param('id') id: string,
    @Body() dto: { pattern?: string; type?: SpamPatternType; severity?: number; isActive?: boolean },
  ) {
    return this.spamService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a spam pattern' })
  async remove(@Param('id') id: string) {
    return this.spamService.remove(id);
  }
}
