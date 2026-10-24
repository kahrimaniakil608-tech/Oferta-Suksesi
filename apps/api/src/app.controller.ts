import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AdminSettingsService } from './admin/settings/admin-settings.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly settingsService: AdminSettingsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('ready')
  ready() { return this.appService.ready(); }

  @Get('site-config')
  @ApiOperation({ summary: 'Public site config (tracking IDs, etc.)' })
  async getSiteConfig() {
    const [gaId, fbPixelId] = await Promise.all([
      this.settingsService.get('google_analytics_id'),
      this.settingsService.get('facebook_pixel_id'),
    ]);
    return {
      maxImagesPerListing: Number(await this.settingsService.get('max_images_per_listing')),
      requireImageToPublish: await this.settingsService.get('require_image_to_publish') === 'true',
      maintenance: await this.settingsService.get('maintenance_mode') === 'true',
      maintenanceMessage: await this.settingsService.get('maintenance_message'),
      googleAnalyticsId: gaId || null,
      facebookPixelId: fbPixelId || null,
    };
  }
}
