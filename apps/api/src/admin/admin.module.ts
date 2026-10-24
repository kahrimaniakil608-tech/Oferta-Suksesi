import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminListingsController } from './listings/admin-listings.controller';
import { AdminListingsService } from './listings/admin-listings.service';
import { AdminAdZonesController } from './ads/admin-ad-zones.controller';
import { AdminAdsController } from './ads/admin-ads.controller';
import { AdminAdsService } from './ads/admin-ads.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminCitiesController } from './cities/admin-cities.controller';
import { AdminCitiesService } from './cities/admin-cities.service';
import { AdminSettingsController } from './settings/admin-settings.controller';
import { AdminSettingsService } from './settings/admin-settings.service';
import { AdminSpamPatternsController } from './spam-patterns/admin-spam-patterns.controller';
import { AdminSpamPatternsService } from './spam-patterns/admin-spam-patterns.service';
import { AdminBadgesController } from './badges/admin-badges.controller';
import { AdminBadgesService } from './badges/admin-badges.service';
import { AdminExportsController } from './exports/admin-exports.controller';
import { AdminExportsService } from './exports/admin-exports.service';
import { SocialMediaService } from './social/social-media.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminListingsController,
    AdminAdZonesController,
    AdminAdsController,
    AdminCategoriesController,
    AdminCitiesController,
    AdminSettingsController,
    AdminSpamPatternsController,
    AdminBadgesController,
    AdminExportsController,
  ],
  providers: [
    AdminUsersService,
    AdminListingsService,
    AdminAdsService,
    AdminCategoriesService,
    AdminCitiesService,
    AdminSettingsService,
    AdminSpamPatternsService,
    AdminBadgesService,
    AdminExportsService,
    SocialMediaService,
  ],
  exports: [AdminSpamPatternsService, AdminSettingsService],
})
export class AdminModule {}
