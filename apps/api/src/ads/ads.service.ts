import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { serializableTransaction } from '../prisma/serializable-transaction';
import { PrismaService } from '../prisma/prisma.service';
import { TrackImpressionDto } from './dto/track-impression.dto';
import { ZoneContextDto } from './dto/zone-context.dto';

@Injectable()
export class AdsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Zone serving ──────────────────────────────────────────────────────────

  async getAdsForZone(slug: string, ctx: ZoneContextDto) {
    const zone = await this.prisma.adZone.findUnique({ where: { slug } });
    if (!zone) throw new NotFoundException(`Ad zone "${slug}" not found`);

    const now = new Date();

    const ads = await this.prisma.advertisement.findMany({
      where: {
        zoneId:    zone.id,
        adType: 'IMAGE_BANNER',
        isActive:  true,
        deletedAt: null,
        startsAt:  { lte: now },
        endsAt:    { gt: now },
        AND: [
          ctx.categoryId !== undefined
            ? {
                OR: [
                  { targetCategories: { none: {} } },
                  { targetCategories: { some: { categoryId: ctx.categoryId } } },
                ],
              }
            : {},
          ctx.cityId !== undefined
            ? {
                OR: [
                  { targetCities: { none: {} } },
                  { targetCities: { some: { cityId: ctx.cityId } } },
                ],
              }
            : {},
        ],
      },
      select: {
        id:              true,
        adType:          true,
        title:           true,
        imageUrl:        true,
        embedCode:       true,
        targetUrl:       true,
        priority:        true,
        zone:            { select: { width: true, height: true, placement: true } },
        targetCategories: { select: { categoryId: true } },
        targetCities:    { select: { cityId: true } },
      },
      orderBy: { priority: 'desc' },
      take:    zone.maxAds,
    });

    return {
      zone: { id: zone.id, name: zone.name, slug: zone.slug, width: zone.width, height: zone.height, rotationInterval: zone.rotationInterval },
      ads,
    };
  }

  // ─── Track impression ──────────────────────────────────────────────────────

  async trackImpression(id: string, dto: TrackImpressionDto, ip: string) {
    return this.track(id, 'impression', ip, dto.pageUrl);
  }

  async trackClick(id: string, ip: string) { return this.track(id, 'click', ip); }

  private async track(id: string, kind: 'impression' | 'click', ip: string, pageUrl?: string) {
    const now = new Date();
    const date = new Date(now.toISOString().slice(0,10));
    const ipHash = createHash('sha256').update(ip || 'unknown').digest('hex');
    let pagePath: string | null = null;
    try { if (pageUrl) pagePath = new URL(pageUrl, 'https://ofertasuksesi.com').pathname.slice(0,500); } catch { /* omit malformed page URLs */ }
    return serializableTransaction(this.prisma, async tx => {
      const ad = await tx.advertisement.findUnique({ where: { id } });
      if (!ad || ad.deletedAt || !ad.isActive || ad.startsAt > now || ad.endsAt <= now || ad.adType !== 'IMAGE_BANNER') throw new NotFoundException('Campaign is not eligible');
      const claim = async (key: string, expiry: Date) => tx.$executeRaw`INSERT INTO event_claims(key,expires_at) VALUES (${key},${expiry}) ON CONFLICT(key) DO UPDATE SET expires_at=EXCLUDED.expires_at WHERE event_claims.expires_at<=${now}`;
      if (!await claim(`ad:${kind}:${id}:${ipHash}`, new Date(now.getTime()+3600000))) return { tracked: false, redirectUrl: ad.targetUrl };
      let unique = 0;
      if (kind === 'impression') {
        unique = await claim(`ad:unique:${id}:${date.toISOString()}:${ipHash}`, new Date(date.getTime()+2*86400000));
        await tx.adImpression.create({ data: { adId: id, ipHash, pageUrl: pagePath, aggregated: true } });
      } else await tx.adClick.create({ data: { adId: id, ipHash, aggregated: true } });
      await tx.adDailyStat.upsert({ where: { adId_date: { adId: id, date } },
        create: { adId: id, date, impressions: kind === 'impression' ? 1 : 0, clicks: kind === 'click' ? 1 : 0, uniqueIps: unique },
        update: { impressions: { increment: kind === 'impression' ? 1 : 0 }, clicks: { increment: kind === 'click' ? 1 : 0 }, uniqueIps: { increment: unique } },
      });
      return { tracked: true, redirectUrl: ad.targetUrl };
    });
  }
}
