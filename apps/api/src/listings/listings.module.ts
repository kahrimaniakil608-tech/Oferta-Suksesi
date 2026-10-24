import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { SpamScoringService } from './spam-scoring.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [ListingsController],
  providers: [ListingsService, SpamScoringService],
})
export class ListingsModule {}
