import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SavedSearchService } from './saved-search.service';
import { SavedSearchController } from './saved-search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController, SavedSearchController],
  providers: [SearchService, SavedSearchService],
  exports: [SearchService],
})
export class SearchModule {}
