import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SavedSearchService } from './saved-search.service';

@ApiTags('saved-searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved searches for current user' })
  async findAll(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.savedSearchService.findAllByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a search' })
  async create(
    @Req() req: Request,
    @Body() dto: { name: string; filters: Record<string, unknown> },
  ) {
    const userId = (req.user as any).id;
    return this.savedSearchService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved search' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: { name?: string; filters?: Record<string, unknown>; isActive?: boolean },
  ) {
    const userId = (req.user as any).id;
    return this.savedSearchService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved search' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.savedSearchService.remove(id, userId);
  }
}
