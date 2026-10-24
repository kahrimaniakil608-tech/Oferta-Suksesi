import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Default values for all known settings keys
export const SETTING_DEFAULTS: Record<string, { value: string; group: string }> = {
  // General
  site_name:                    { value: 'OfertaSuksesi',                    group: 'general'      },
  site_tagline:                 { value: 'Platforma #1 e shpalljeve në Kosovë', group: 'general'   },
  contact_email:                { value: 'info@ofertasuksesi.com',            group: 'general'      },
  support_phone:                { value: '+383 45 50 68 50',                   group: 'general'      },
  site_logo_url:                { value: '',                                  group: 'general'      },
  // Listings
  max_listings_per_user:        { value: '20',                               group: 'listings'     },
  max_images_per_listing:       { value: '8',                                group: 'listings'     },
  listing_expiry_days:          { value: '30',                               group: 'listings'     },
  require_image_to_publish:     { value: 'false',                            group: 'listings'     },
  auto_approve_listings:        { value: 'false',                            group: 'listings'     },
  // Moderation
  spam_threshold_auto_reject:   { value: '80',                               group: 'moderation'   },
  trust_score_first_listing:    { value: '10',                               group: 'moderation'   },
  trust_score_subsequent:       { value: '3',                                group: 'moderation'   },
  trust_score_reject_penalty:   { value: '10',                               group: 'moderation'   },
  // Registration
  allow_registration:           { value: 'true',                             group: 'registration' },
  email_verification_required:  { value: 'false',                            group: 'registration' },
  // Maintenance
  maintenance_mode:             { value: 'false',                            group: 'maintenance'  },
  maintenance_message:          { value: 'Faqja është nën mirëmbajtje. Kthehuni së shpejti.', group: 'maintenance' },
  // Social
  social_facebook:              { value: 'https://www.facebook.com/OfertaSuksesi1996', group: 'social' },
  social_instagram:             { value: 'https://www.instagram.com/ofertasuksesi1996/', group: 'social' },
  social_x:                     { value: 'https://x.com/ofertasuksesi96',     group: 'social'       },
  social_tiktok:                { value: '',                                  group: 'social'       },
  social_youtube:               { value: '',                                  group: 'social'       },
  // Integrations
  google_analytics_id:          { value: '',                                  group: 'integrations' },
  facebook_pixel_id:            { value: '',                                  group: 'integrations' },
};

export const SUPPORTED_SETTINGS = new Set([
  'allow_registration','maintenance_mode','maintenance_message','max_listings_per_user',
  'max_images_per_listing','listing_expiry_days','require_image_to_publish','auto_approve_listings',
  'spam_threshold_auto_reject','trust_score_first_listing','trust_score_subsequent','trust_score_reject_penalty','google_analytics_id',
]);
export async function runtimeSettings(db: Pick<PrismaService, 'siteSetting'>): Promise<Record<string,string>> {
  const values = Object.fromEntries(Object.entries(SETTING_DEFAULTS).map(([key, setting]) => [key, setting.value]));
  for (const row of await db.siteSetting.findMany()) if (SUPPORTED_SETTINGS.has(row.key)) values[row.key] = row.value;
  return values;
}

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get all settings (with defaults for missing keys) ────────────────────

  async getAll(): Promise<Record<string, Record<string, string>>> {
    const stored = await this.prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const row of stored) {
      map[row.key] = row.value;
    }

    // Merge with defaults (stored value wins)
    const merged: Record<string, string> = {};
    for (const [key, def] of Object.entries(SETTING_DEFAULTS)) {
      merged[key] = map[key] ?? def.value;
    }

    // Group by section
    const grouped: Record<string, Record<string, string>> = {};
    for (const [key, def] of Object.entries(SETTING_DEFAULTS)) {
      const g = def.group;
      if (!grouped[g]) grouped[g] = {};
      grouped[g][key] = merged[key];
    }

    return grouped;
  }

  // ─── Bulk upsert ──────────────────────────────────────────────────────────

  async bulkSet(settings: Record<string, string>): Promise<{ updated: number }> {
    const entries = Object.entries(settings);
    const ranges: Record<string, [number,number]> = { max_listings_per_user: [1,1000], max_images_per_listing: [1,8], listing_expiry_days: [1,365], spam_threshold_auto_reject: [0,100], trust_score_first_listing: [0,100], trust_score_subsequent: [0,50], trust_score_reject_penalty: [0,50] };
    for (const [key,value] of entries) {
      if (!SUPPORTED_SETTINGS.has(key) || typeof value !== 'string') throw new BadRequestException(`Unsupported setting: ${key}`);
      if (ranges[key] && (!/^\d+$/.test(value) || Number(value)<ranges[key][0] || Number(value)>ranges[key][1])) throw new BadRequestException(`Invalid value for ${key}`);
      if (SETTING_DEFAULTS[key]?.value === 'true' || SETTING_DEFAULTS[key]?.value === 'false') if (!['true','false'].includes(value)) throw new BadRequestException(`Invalid boolean: ${key}`);
      if (value.length > 2000) throw new BadRequestException('Setting is too long');
      if (key === 'google_analytics_id' && value && !/^G-[A-Z0-9]+$/.test(value)) throw new BadRequestException('Invalid Google Analytics ID');
    }
    await this.prisma.$transaction(entries.map(([key,value]) => this.prisma.siteSetting.upsert({ where: { key }, create: { key,value,group: SETTING_DEFAULTS[key].group }, update: { value } })));

    return { updated: entries.length };
  }

  // ─── Get single value (for use inside other services) ─────────────────────

  async get(key: string): Promise<string> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? SETTING_DEFAULTS[key]?.value ?? '';
  }
}
