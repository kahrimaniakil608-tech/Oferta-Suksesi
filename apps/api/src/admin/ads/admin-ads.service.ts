import { attachAsset } from '../../media/asset-ownership';
import { serializableTransaction } from '../../prisma/serializable-transaction';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdZoneDto } from './dto/create-ad-zone.dto';
import { UpdateAdZoneDto } from './dto/update-ad-zone.dto';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { DuplicateAdDto } from './dto/duplicate-ad.dto';
import { AdStatusFilter, ListAdsDto } from './dto/list-ads.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ctr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100;
}

@Injectable()
export class AdminAdsService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
  }

  // ── Helper: get total impressions/clicks for an ad from daily stats ────────

  private async getAdTotals(adId: string) {
    const result = await this.prisma.adDailyStat.aggregate({
      where: { adId },
      _sum: { impressions: true, clicks: true, uniqueIps: true },
    });
    return {
      impressions: result._sum.impressions ?? 0,
      clicks: result._sum.clicks ?? 0,
      uniqueIps: result._sum.uniqueIps ?? 0,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AD ZONES
  // ══════════════════════════════════════════════════════════════════════════

  async findAllZones() {
    const now = new Date();

    const zones = await this.prisma.adZone.findMany({
      include: {
        _count: { select: { ads: true } },
        ads: {
          where: {
            isActive:  true,
            deletedAt: null,
            startsAt:  { lte: now },
            endsAt:    { gte: now },
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return zones.map((z) => ({
      ...z,
      activeAdCount: z.ads.length,
      totalAdCount:  z._count.ads,
      ads: undefined,
      _count: undefined,
    }));
  }

  async createZone(dto: CreateAdZoneDto) {
    const existing = await this.prisma.adZone.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Zone slug "${dto.slug}" already exists`);

    return this.prisma.adZone.create({ data: dto });
  }

  async updateZone(id: string, dto: UpdateAdZoneDto) {
    await this.findZoneOrFail(id);

    if (dto.slug) {
      const conflict = await this.prisma.adZone.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Zone slug "${dto.slug}" already exists`);
    }

    return this.prisma.adZone.update({ where: { id }, data: dto });
  }

  async deleteZone(id: string) {
    await this.findZoneOrFail(id);

    await this.prisma.advertisement.deleteMany({ where: { zoneId: id } });
    await this.prisma.adZone.delete({ where: { id } });

    return { message: 'Zone and all its ads deleted.' };
  }

  private async findZoneOrFail(id: string) {
    const zone = await this.prisma.adZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`Ad zone ${id} not found`);
    return zone;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADVERTISEMENTS
  // ══════════════════════════════════════════════════════════════════════════

  async findAll(dto: ListAdsDto) {
    const { page = 1, limit = 20, zoneId, status, search } = dto;
    const skip = (page - 1) * limit;
    const now  = new Date();

    const where: any = { deletedAt: null };

    if (zoneId) where.zoneId = zoneId;

    if (search) {
      where.OR = [
        { advertiserName: { contains: search, mode: 'insensitive' } },
        { title:          { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      switch (status) {
        case AdStatusFilter.ACTIVE:
          where.isActive = true;
          where.startsAt = { lte: now };
          where.endsAt   = { gte: now };
          break;
        case AdStatusFilter.SCHEDULED:
          where.isActive = true;
          where.startsAt = { gt: now };
          break;
        case AdStatusFilter.EXPIRED:
          where.endsAt = { lt: now };
          break;
        case AdStatusFilter.PAUSED:
          where.isActive = false;
          break;
      }
    }

    const [ads, total] = await this.prisma.$transaction([
      this.prisma.advertisement.findMany({
        where,
        include: {
          zone:            { select: { id: true, name: true, slug: true, placement: true } },
          targetCategories: { select: { categoryId: true } },
          targetCities:    { select: { cityId: true } },
          dailyStats:      { select: { impressions: true, clicks: true } },
        },
        orderBy:  { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    const data = ads.map((ad) => {
      const totalImpressions = ad.dailyStats.reduce((s, d) => s + d.impressions, 0);
      const totalClicks = ad.dailyStats.reduce((s, d) => s + d.clicks, 0);
      return {
        ...ad,
        dailyStats: undefined,
        _count: { impressions: totalImpressions, clicks: totalClicks },
        ctr: ctr(totalClicks, totalImpressions),
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where:   { id },
      include: {
        zone: true,
        targetCategories: { select: { categoryId: true } },
        targetCities:    { select: { cityId: true } },
      },
    });
    if (!ad) throw new NotFoundException(`Advertisement ${id} not found`);

    const totals = await this.getAdTotals(id);

    // Daily stats from AdDailyStat — last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = await this.prisma.adDailyStat.findMany({
      where: { adId: id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, impressions: true, clicks: true },
    });

    return {
      ...ad,
      _count: { impressions: totals.impressions, clicks: totals.clicks },
      ctr: ctr(totals.clicks, totals.impressions),
      uniqueViewers: totals.uniqueIps,
      dailyStats: dailyStats.map((d) => ({
        day: d.date.toISOString().slice(0, 10),
        impressions: d.impressions,
        clicks: d.clicks,
      })),
    };
  }

  async create(dto: CreateAdDto, actorId: string) {
    await this.findZoneOrFail(dto.zoneId);

    this.validateDates(dto.startsAt, dto.endsAt);

    const { categoryIds, cityIds, ...rest } = dto;

    if (!dto.imageUrl) throw new BadRequestException('An image banner is required');
    return serializableTransaction(this.prisma, async tx => {
    await attachAsset(tx, dto.imageUrl, null, actorId, 'ad-banner');
    return tx.advertisement.create({
      data: {
        ...rest,
        startsAt: new Date(dto.startsAt),
        endsAt:   new Date(dto.endsAt),
        ...(categoryIds?.length && {
          targetCategories: { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } },
        }),
        ...(cityIds?.length && {
          targetCities: { createMany: { data: cityIds.map((cityId) => ({ cityId })) } },
        }),
      },
      include: { zone: true, targetCategories: true, targetCities: true },
    });
    });
  }

  async update(id: string, dto: UpdateAdDto, actorId: string) {
    const ad = await this.findAdOrFail(id);

    if (dto.zoneId) await this.findZoneOrFail(dto.zoneId);
    if (dto.startsAt || dto.endsAt) {
      const current = await this.prisma.advertisement.findUnique({ where: { id } });
      this.validateDates(
        dto.startsAt ?? current!.startsAt.toISOString(),
        dto.endsAt   ?? current!.endsAt.toISOString(),
      );
    }

    const { categoryIds, cityIds, ...rest } = dto;

    return serializableTransaction(this.prisma, async tx => {
      if ((dto.adType ?? ad.adType) !== 'IMAGE_BANNER') throw new BadRequestException('Only image banners are supported');
      if (dto.imageUrl === '') throw new BadRequestException('An image banner is required');
      await attachAsset(tx, dto.imageUrl, ad.imageUrl, actorId, 'ad-banner');
      if (categoryIds !== undefined) {
        await tx.adTargetCategory.deleteMany({ where: { adId: id } });
      }
      if (cityIds !== undefined) {
        await tx.adTargetCity.deleteMany({ where: { adId: id } });
      }

      return tx.advertisement.update({
        where: { id },
        data: {
          ...rest,
          ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
          ...(dto.endsAt   && { endsAt:   new Date(dto.endsAt) }),
          ...(categoryIds?.length && {
            targetCategories: { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } },
          }),
          ...(cityIds?.length && {
            targetCities: { createMany: { data: cityIds.map((cityId) => ({ cityId })) } },
          }),
        },
        include: { zone: true, targetCategories: true, targetCities: true },
      });
    });
  }

  async softDelete(id: string) {
    const ad = await this.findAdOrFail(id);
    if (ad.deletedAt) throw new BadRequestException('Advertisement is already deleted');

    await this.prisma.advertisement.update({
      where: { id },
      data:  { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Advertisement deleted. Daily stats preserved.' };
  }

  async pause(id: string) {
    const ad = await this.findAdOrFail(id);
    if (!ad.isActive) throw new BadRequestException('Advertisement is already paused');

    await this.prisma.advertisement.update({ where: { id }, data: { isActive: false } });
    return { message: 'Campaign paused.' };
  }

  async resume(id: string) {
    const ad = await this.findAdOrFail(id);
    if (ad.adType !== 'IMAGE_BANNER' || !ad.imageUrl) throw new BadRequestException('Upload an image banner before activating this campaign');
    if (ad.isActive) throw new BadRequestException('Advertisement is already active');
    if (ad.deletedAt) throw new BadRequestException('Cannot resume a deleted advertisement');

    await this.prisma.advertisement.update({ where: { id }, data: { isActive: true } });
    return { message: 'Campaign resumed.' };
  }

  async duplicate(id: string, dto: DuplicateAdDto) {
    const original = await this.prisma.advertisement.findUnique({
      where:   { id },
      include: {
        targetCategories: { select: { categoryId: true } },
        targetCities:     { select: { cityId: true } },
      },
    });
    if (!original) throw new NotFoundException(`Advertisement ${id} not found`);

    this.validateDates(dto.startsAt, dto.endsAt);


    const { id: _, createdAt, updatedAt, deletedAt, targetCategories, targetCities, ...rest } = original as any;

    return this.prisma.advertisement.create({
      data: {
        ...rest,
        title:    dto.title ?? `${original.title} (copy)`,
        startsAt: new Date(dto.startsAt),
        endsAt:   new Date(dto.endsAt),
        isActive: false,
        ...(targetCategories.length && {
          targetCategories: { createMany: { data: targetCategories } },
        }),
        ...(targetCities.length && {
          targetCities: { createMany: { data: targetCities } },
        }),
      },
      include: { zone: true, targetCategories: true, targetCities: true },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard() {
    const now       = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalActive, todayStats] = await this.prisma.$transaction([
      this.prisma.advertisement.count({
        where: { isActive: true, deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } },
      }),
      this.prisma.adDailyStat.aggregate({
        where: { date: todayStart },
        _sum: { impressions: true, clicks: true },
      }),
    ]);

    const impressionsToday = todayStats._sum.impressions ?? 0;
    const clicksToday = todayStats._sum.clicks ?? 0;
    const overallCtr = ctr(clicksToday, impressionsToday);

    // Top 10 by CTR from daily stats (min 10 impressions)
    const topAdsRaw = await this.prisma.$queryRaw<
      Array<{ id: string; title: string; imp: bigint; clk: bigint }>
    >`
      SELECT a.id, a.title,
             COALESCE(SUM(ds.impressions), 0) AS imp,
             COALESCE(SUM(ds.clicks), 0) AS clk
      FROM   advertisements a
      LEFT   JOIN ad_daily_stats ds ON ds.ad_id = a.id
      WHERE  a.deleted_at IS NULL
      GROUP  BY a.id, a.title
      HAVING COALESCE(SUM(ds.impressions), 0) >= 10
      ORDER  BY (COALESCE(SUM(ds.clicks), 0)::float / NULLIF(COALESCE(SUM(ds.impressions), 0), 0)) DESC
      LIMIT  10`;

    // Bottom 5 active (lowest impressions, running > 1 day)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lowAds = await this.prisma.advertisement.findMany({
      where: {
        isActive: true, deletedAt: null,
        startsAt: { lte: oneDayAgo },
        endsAt:   { gte: now },
      },
      include: {
        zone: { select: { id: true, name: true, slug: true, placement: true } },
        targetCategories: { select: { categoryId: true } },
        targetCities:    { select: { cityId: true } },
        dailyStats:      { select: { impressions: true, clicks: true } },
      },

    });

    const lowAdsSorted = lowAds
      .map((ad) => {
        const totalImp = ad.dailyStats.reduce((s, d) => s + d.impressions, 0);
        const totalClk = ad.dailyStats.reduce((s, d) => s + d.clicks, 0);
        return {
          ...ad,
          dailyStats: undefined,
          _count: { impressions: totalImp, clicks: totalClk },
          ctr: ctr(totalClk, totalImp),
        };
      })
      .sort((a, b) => a._count.impressions - b._count.impressions || a.id.localeCompare(b.id))
      .slice(0, 5);

    return {
      totalActiveCampaigns: totalActive,
      impressionsToday,
      clicksToday,
      overallCtrToday: overallCtr,
      topPerforming: topAdsRaw.map((r) => ({
        id:          r.id,
        title:       r.title,
        impressions: Number(r.imp),
        clicks:      Number(r.clk),
        ctr:         ctr(Number(r.clk), Number(r.imp)),
      })),
      underperforming: lowAdsSorted,
    };
  }

  async getCampaignAnalytics(id: string) {
    const ad = await this.findAdOrFail(id);

    const totals = await this.getAdTotals(id);

    // Full lifetime daily breakdown from AdDailyStat
    const dailyStats = await this.prisma.adDailyStat.findMany({
      where: { adId: id },
      orderBy: { date: 'asc' },
      select: { date: true, impressions: true, clicks: true },
    });

    // Today's hourly breakdown — still from raw impressions (only today's data, very small)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const hourlyToday = await this.prisma.$queryRaw<Array<{ hour: number; impressions: bigint; clicks: bigint }>>`
      SELECT extract(hour from created_at)::integer AS hour,
        sum(impressions) AS impressions, sum(clicks) AS clicks FROM (
        SELECT created_at, 1 AS impressions, 0 AS clicks FROM ad_impressions WHERE ad_id=${id} AND created_at>=${todayStart}
        UNION ALL SELECT created_at,0,1 FROM ad_clicks WHERE ad_id=${id} AND created_at>=${todayStart}
      ) events GROUP BY hour ORDER BY hour`;

    // Top pages — from recent raw impressions (last 7 days only)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topPages = await this.prisma.$queryRaw<Array<{ page_url: string; count: bigint }>>`
      SELECT page_url, COUNT(*) AS count
      FROM ad_impressions
      WHERE ad_id = ${id} AND page_url IS NOT NULL AND created_at >= ${sevenDaysAgo}
      GROUP BY page_url ORDER BY count DESC LIMIT 10`;

    return {
      id:          ad.id,
      title:       ad.title,
      startsAt:    ad.startsAt,
      endsAt:      ad.endsAt,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      uniqueViewers: totals.uniqueIps,
      ctr: ctr(totals.clicks, totals.impressions),
      dailyStats: dailyStats.map((d) => ({
        day: d.date.toISOString().slice(0, 10),
        impressions: d.impressions,
        clicks: d.clicks,
      })),
      hourlyToday: hourlyToday.map((r) => ({
        hour: r.hour, impressions: Number(r.impressions), clicks: Number(r.clicks),
      })),
      topPages: topPages.map((r) => ({
        pageUrl: r.page_url,
        count:   Number(r.count),
      })),
    };
  }

  async getZonesPerformance() {
    const now = new Date();

    const zones = await this.prisma.adZone.findMany({
      include: {
        ads: {
          where: { deletedAt: null },
          include: {
            dailyStats: { select: { impressions: true, clicks: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return zones.map((zone) => {
      const totalImpressions = zone.ads.reduce(
        (s, a) => s + a.dailyStats.reduce((ss, d) => ss + d.impressions, 0), 0,
      );
      const totalClicks = zone.ads.reduce(
        (s, a) => s + a.dailyStats.reduce((ss, d) => ss + d.clicks, 0), 0,
      );
      const activeCampaigns = zone.ads.filter(
        (a) => a.isActive && a.startsAt <= now && a.endsAt >= now,
      ).length;

      return {
        id:            zone.id,
        name:          zone.name,
        slug:          zone.slug,
        placement:     zone.placement,
        maxAds:        zone.maxAds,
        activeCampaigns,
        totalCampaigns: zone.ads.length,
        totalImpressions,
        totalClicks,
        ctr: ctr(totalClicks, totalImpressions),
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────

  private async findAdOrFail(id: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException(`Advertisement ${id} not found`);
    return ad;
  }

  private validateDates(startsAt: string, endsAt: string) {
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }
}
