import { submissionFingerprint } from './submission-fingerprint';
import { attachListingImages } from '../media/asset-ownership';
import { serializableTransaction } from '../prisma/serializable-transaction';
import { runtimeSettings } from '../admin/settings/admin-settings.service';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchService } from '../search/search.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateGuestListingDto } from './dto/create-guest-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto, SortOption } from './dto/listing-query.dto';
import { ReportListingDto } from './dto/report-listing.dto';
import { ContactListingDto } from './dto/contact-listing.dto';
import { SpamScoringService } from './spam-scoring.service';
import { ListingStatus, PostingStatus, Role, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { publicListingWhere, isPublicListing } from './listing-visibility';
import { deletionTransaction, deleteListingsPreservingPayments } from './delete-listings';
import { createHash } from 'crypto';

// ─── Slug helpers ─────────────────────────────────────────────────────────────

const ALBANIAN_MAP: Record<string, string> = {
  ë: 'e', Ë: 'e', ç: 'c', Ç: 'c',
  ä: 'a', ö: 'o', ü: 'u', ß: 'ss',
  š: 's', ž: 'z', đ: 'd', ć: 'c', č: 'c',
};

function slugify(text: string): string {
  return text
    .split('')
    .map((c) => ALBANIAN_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Listing include ──────────────────────────────────────────────────────────

const LISTING_INCLUDE = {
  images: { orderBy: { position: 'asc' as const } },
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true, region: true } },
  user: { select: { id: true, name: true, slug: true, avatarUrl: true, trustScore: true } },
} as const;

const LISTING_LIST_INCLUDE = {
  images: {
    where: { isPrimary: true },
    take: 1,
    orderBy: { position: 'asc' as const },
  },
  category: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly search: SearchService,
    private readonly spamScoring: SpamScoringService,
  ) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(query: ListingQueryDto) {
    const {
      category, subcategory, city, status, isFeatured, isUrgent,
      price_min, price_max, has_photos, q,
      sort = SortOption.NEWEST,
      page = 1, limit = 20,
    } = query;

    if (status && status !== ListingStatus.PUBLISHED) {
      throw new BadRequestException('Use your dashboard to view private listings');
    }
    const where: any = publicListingWhere();

    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isUrgent !== undefined)   where.isUrgent = isUrgent;

    if (category) {
      where.category = { slug: category };
    }
    if (subcategory) {
      where.subcategory = { slug: subcategory };
    }
    if (city) {
      where.city = { slug: city };
    }

    if (has_photos) {
      where.images = { some: {} };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (price_min !== undefined || price_max !== undefined) where.numericPrice = {
      ...(price_min !== undefined && { gte: price_min }), ...(price_max !== undefined && { lte: price_max }),
    };

    const orderBy = this.buildOrderBy(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: LISTING_LIST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildOrderBy(sort: SortOption): any {
    // Featured listings always come first, regardless of sort option
    switch (sort) {
      case SortOption.OLDEST:
        return [
          { isFeatured: 'desc' as const },
          { createdAt: 'asc' as const }, { id: 'asc' },
        ];
      case SortOption.PRICE_ASC:
        return [{ numericPrice: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
      case SortOption.PRICE_DESC:
        return [{ numericPrice: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
      case SortOption.VIEWS:
        return [{ viewsCount: 'desc' }, { id: 'asc' }];
      default:
        return [
          { isFeatured: 'desc' as const },
          { bumpedAt: { sort: 'desc' as const, nulls: 'last' as const } },
          { createdAt: 'desc' as const }, { id: 'asc' },
        ];
    }
  }

  // ─── Find one ──────────────────────────────────────────────────────────────

  async findOne(idOrSlug: string) {
    // Try slug first, fall back to id (for backwards compat / admin links)
    let listing = await this.prisma.listing.findUnique({
      where: { slug: idOrSlug },
      include: LISTING_INCLUDE,
    });

    if (!listing) {
      listing = await this.prisma.listing.findUnique({
        where: { id: idOrSlug },
        include: LISTING_INCLUDE,
      });
    }

    if (!listing || !isPublicListing(listing)) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateListingDto, userId: string) {
    this.assertPromotionUnchanged(dto);
    return this.submitOnce(dto, `user:${userId}`, async tx => {
    const settings = await runtimeSettings(tx);
    this.assertPromotionUnchanged(dto);
    await this.validateListingDetails(dto.categoryId, dto.subcategoryId, dto.cityId, dto.attributes ?? {}, tx);
    await this.assertCompanyAccess(dto.companyId, userId, tx);

    // Build unique slug
    const baseSlug = slugify(dto.title);
    const slug = await this.uniqueSlug(baseSlug, tx);

    // Determine listing status based on user's postingStatus and trustScore
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { trustScore: true, postingStatus: true },
    });

    let status: ListingStatus;
    if (user?.postingStatus === PostingStatus.REQUIRES_APPROVAL) {
      // User is flagged — always needs approval regardless of trust score
      status = ListingStatus.PENDING_REVIEW;
    } else {
      // AUTO_PUBLISH — use trust score threshold
      status = settings.auto_approve_listings === 'true' || (user?.trustScore ?? 0) >= 40
        ? ListingStatus.PUBLISHED
        : ListingStatus.PENDING_REVIEW;
    }

    // Spam scoring — if score >= 50, force moderation review
    const spamScore = await this.spamScoring.score(dto.title, dto.description, tx);
    if (spamScore >= 50 && status === ListingStatus.PUBLISHED) {
      status = ListingStatus.PENDING_REVIEW;
    }

    const expiresAt = new Date(Date.now() + Number((await runtimeSettings(tx)).listing_expiry_days) * 86400000);

    const policy = await runtimeSettings(tx);
    if ((dto.images?.length ?? 0) > Number(policy.max_images_per_listing)) throw new BadRequestException('Too many images');
    if (policy.require_image_to_publish === 'true' && !dto.images?.length) throw new BadRequestException('At least one image is required');
    const imageRecords = (dto.images ?? []).map((img, i) => ({
      url:       img.url,
      thumbUrl:  img.thumbUrl,
      mediumUrl: img.mediumUrl,
      position:  i,
      isPrimary: i === 0,
    }));

    await attachListingImages(tx, dto.images ?? [], userId);
    const listing = await tx.listing.create({
      data: {
        userId,
        categoryId:    dto.categoryId,
        subcategoryId: dto.subcategoryId,
        cityId:        dto.cityId,
        companyId:     dto.companyId,
        title:         dto.title,
        slug,
        description:   dto.description,
        attributes:    (dto.attributes ?? {}) as any,
        isFeatured:    false,
        isUrgent:      false,
        status: Number(policy.spam_threshold_auto_reject) > 0 && spamScore >= Number(policy.spam_threshold_auto_reject) ? ListingStatus.REJECTED : status,
        expiresAt,
        spamScore,
        bumpedAt:      status === ListingStatus.PUBLISHED ? new Date() : null,
        ...(imageRecords.length > 0 && { images: { create: imageRecords } }),
      },
      include: LISTING_INCLUDE,
    });

    // Log spam score if listing went to moderation
    if (status === ListingStatus.PENDING_REVIEW && spamScore > 0) {
      await tx.moderationLog.create({
        data: {
          listingId: listing.id,
          action: 'AUTO_SPAM_SCORED',
          reason: `Spam score: ${spamScore}`,
          spamScore,
        },
      });
    }

    return listing;
    });
  }

  // ─── Guest Create ────────────────────────────────────────────────────────

  async createGuest(dto: CreateGuestListingDto, ipAddress: string) {
    this.assertPromotionUnchanged(dto);
    // Rate limit: max 7 guest posts per day per IP
    const ipHash = createHash('sha256').update(ipAddress || 'unknown').digest('hex');
    const todayKey = `guest_post:${ipHash}:${new Date().toISOString().split('T')[0]}`;
    const existing = dto.requestId ? await this.prisma.submission.findUnique({ where: { key: `guest:${ipHash}:${dto.requestId}` } }) : null;
    if (!existing && !await (dto.requestId ? this.redis.reserveQuotaOnce(todayKey, dto.requestId, 7, 86400) : this.redis.reserveQuota(todayKey, 1, 7, 86400))) {
      throw new BadRequestException('Keni arritur limitin ditor të postimeve (7 në ditë). Krijoni një llogari për postime pa limit.');
    }

    return this.submitOnce(dto, `guest:${ipHash}`, async tx => {
    const spamScore = await this.spamScoring.score(dto.title, dto.description, tx);
    this.assertPromotionUnchanged(dto);
    await this.validateListingDetails(dto.categoryId, dto.subcategoryId, dto.cityId, dto.attributes ?? {}, tx);

    const baseSlug = slugify(dto.title);
    const slug = await this.uniqueSlug(baseSlug, tx);
    const expiresAt = new Date(Date.now() + Number((await runtimeSettings(tx)).listing_expiry_days) * 86400000);

    const policy = await runtimeSettings(tx);
    if ((dto.images?.length ?? 0) > Number(policy.max_images_per_listing)) throw new BadRequestException('Too many images');
    if (policy.require_image_to_publish === 'true' && !dto.images?.length) throw new BadRequestException('At least one image is required');
    const imageRecords = (dto.images ?? []).map((img, i) => ({
      url:       img.url,
      thumbUrl:  img.thumbUrl,
      mediumUrl: img.mediumUrl,
      position:  i,
      isPrimary: i === 0,
    }));

    await attachListingImages(tx, dto.images ?? [], null);
    const listing = await tx.listing.create({
      data: {
        // No userId — guest listing
        categoryId:     dto.categoryId,
        subcategoryId:  dto.subcategoryId,
        cityId:         dto.cityId,
        title:          dto.title,
        slug,
        description:    dto.description,
        attributes:     (dto.attributes ?? {}) as any,
        isUrgent:       false,
        isFeatured:     false,
        isGuestListing: true,
        guestName:      dto.guestName,
        guestPhone:     dto.guestPhone,
        guestEmail:     dto.guestEmail,
        spamScore,
        status: Number(policy.spam_threshold_auto_reject) > 0 && spamScore >= Number(policy.spam_threshold_auto_reject) ? ListingStatus.REJECTED : ListingStatus.PENDING_REVIEW,
        expiresAt,
        ...(imageRecords.length > 0 && { images: { create: imageRecords } }),
      },
      include: LISTING_INCLUDE,
    });

    // Log spam score for guest listings
    if (spamScore > 0) {
      await tx.moderationLog.create({
        data: {
          listingId: listing.id,
          action: 'AUTO_SPAM_SCORED',
          reason: `Guest listing spam score: ${spamScore}`,
          spamScore,
        },
      });
    }

    return listing;
    });
  }

  private async submitOnce(dto: CreateListingDto | CreateGuestListingDto, identity: string, create: (tx: Prisma.TransactionClient) => Promise<any>) {
    const { requestId, turnstileToken: _captcha, ...content } = dto as any;
    const fingerprint = submissionFingerprint(content);
    const key = requestId ? `${identity}:${requestId}` : null;
    try { return await serializableTransaction(this.prisma, async tx => {
      if (key) {
        const saved = await tx.submission.findUnique({ where: { key } });
        if (saved) {
          if (saved.fingerprint !== fingerprint) throw new ConflictException('Submission key was already used for different content');
          const listing = await tx.listing.findUnique({ where: { id: saved.listingId }, include: LISTING_INCLUDE });
          if (!listing) throw new ConflictException('This submission was already processed and removed');
          return listing;
        }
      }
      const listing = await create(tx);
      if (key) await tx.submission.create({ data: { key, fingerprint, listingId: listing.id } });
      return listing;
    }); } catch (error) {
      // A simultaneous duplicate may lose on a unique slug/receipt constraint before it sees the committed receipt.
      if (key) {
        const saved = await this.prisma.submission.findUnique({ where: { key } });
        if (saved) {
          if (saved.fingerprint !== fingerprint) throw new ConflictException('Submission key was already used for different content');
          const listing = await this.prisma.listing.findUnique({ where: { id: saved.listingId }, include: LISTING_INCLUDE });
          if (listing) return listing;
        }
      }
      throw error;
    }
  }

  private async uniqueSlug(base: string, client: Prisma.TransactionClient): Promise<string> {
    const existing = await client.listing.findUnique({ where: { slug: base } });
    if (!existing) return base;
    const suffix = randomBytes(2).toString('hex');
    return `${base}-${suffix}`;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateListingDto, userId: string, userRole: Role) {
    const listing = await this.findOneOrFail(id);
    this.assertOwnerOrAdmin(listing.userId, userId, userRole);

    this.assertPromotionUnchanged(dto, listing);
    if (dto.images === null) throw new BadRequestException('Use an empty array to remove all images');
    if (dto.status && ![ListingStatus.DRAFT, ListingStatus.PENDING_REVIEW, ListingStatus.ARCHIVED].includes(dto.status as any)) {
      throw new ForbiddenException('Publication decisions require the moderation endpoint');
    }
    if (listing.status === ListingStatus.ARCHIVED) {
      throw new BadRequestException('Restore the listing before editing it');
    }
    const subcategoryId = dto.subcategoryId !== undefined ? dto.subcategoryId
      : dto.categoryId !== undefined && dto.categoryId !== listing.categoryId ? null : listing.subcategoryId;
    await this.validateListingDetails(dto.categoryId ?? listing.categoryId, subcategoryId,
      dto.cityId ?? listing.cityId, (dto.attributes ?? listing.attributes) as Record<string, unknown>);
    if (dto.companyId !== undefined) await this.assertCompanyAccess(dto.companyId, userId);

    // Owner edits cannot bypass an existing review/rejection or renew an expired listing.
    const policy = await runtimeSettings(this.prisma);
    const spamScore = await this.spamScoring.score(dto.title ?? listing.title, dto.description ?? listing.description);
    let status = dto.status ?? listing.status;
    if (listing.status === ListingStatus.REJECTED && !dto.status) status = ListingStatus.PENDING_REVIEW;
    if (status === ListingStatus.PUBLISHED) {
      const owner = listing.userId ? await this.prisma.user.findUnique({ where: { id: listing.userId } }) : null;
      if (!owner || owner.postingStatus === PostingStatus.REQUIRES_APPROVAL || (policy.auto_approve_listings !== 'true' && owner.trustScore < 40) || spamScore >= 50) {
        status = ListingStatus.PENDING_REVIEW;
      } else if (listing.expiresAt && listing.expiresAt <= new Date()) {
        status = ListingStatus.EXPIRED;
      }
    }

    if (![ListingStatus.DRAFT, ListingStatus.ARCHIVED, ListingStatus.EXPIRED].includes(status as any) && Number(policy.spam_threshold_auto_reject) > 0 && spamScore >= Number(policy.spam_threshold_auto_reject)) status = ListingStatus.REJECTED;
    return serializableTransaction(this.prisma, async tx => {
      if (dto.images) await attachListingImages(tx, dto.images, userId, id);
    const updated = await this.updateUnchangedListing(listing, {
      where: { id },
      data: {
        ...(dto.title         !== undefined && { title: dto.title }),
        ...(dto.description   !== undefined && { description: dto.description }),
        ...(dto.categoryId    !== undefined && { categoryId: dto.categoryId }),
        subcategoryId,
        ...(dto.cityId        !== undefined && { cityId: dto.cityId }),
        ...(dto.companyId     !== undefined && { companyId: dto.companyId }),
        ...(dto.attributes    !== undefined && { attributes: dto.attributes as any }),
        status, spamScore,
        ...(dto.images !== undefined && { images: { deleteMany: {}, create: dto.images.map((img, position) => ({
          url: img.url, thumbUrl: img.thumbUrl, mediumUrl: img.mediumUrl, position, isPrimary: position === 0,
        })) } }),
      } as any,
      include: LISTING_INCLUDE,
    }, tx);

    // Database triggers enqueue indexing only when this transaction commits.

    return updated;
    });
  }

  // ─── Delete (archive) ──────────────────────────────────────────────────────

  async remove(id: string, userId: string, userRole: Role) {
    const listing = await this.findOneOrFail(id);
    this.assertOwnerOrAdmin(listing.userId, userId, userRole);

    const archived = await this.updateUnchangedListing(listing, {
      where: { id },
      data: { status: ListingStatus.ARCHIVED },
      select: { id: true, status: true },
    });

    // Remove from Meilisearch index (fire-and-forget)
    this.search.removeListing(id).catch(() => {});

    return archived;
  }

  // ─── Restore (un-archive) ───────────────────────────────────────────────

  async restore(id: string, userId: string, userRole: Role) {
    const listing = await this.findOneOrFail(id);
    this.assertOwnerOrAdmin(listing.userId, userId, userRole);

    if (listing.status !== ListingStatus.ARCHIVED) {
      throw new BadRequestException('Only archived listings can be restored');
    }

    return this.updateUnchangedListing(listing, {
      where: { id },
      data: { status: ListingStatus.DRAFT },
      select: { id: true, status: true },
    });
  }

  // ─── Permanent Delete (user) ───────────────────────────────────────────────

  async permanentDelete(id: string, userId: string) {
    await deletionTransaction(this.prisma, async tx => {
      const listing = await tx.listing.findUnique({ where: { id } });
      if (!listing) throw new NotFoundException('Listing not found');
      this.assertOwner(listing.userId, userId);
      if (listing.deletedAt || listing.status !== ListingStatus.ARCHIVED) {
        throw new BadRequestException('Only archived listings can be permanently deleted');
      }
      await deleteListingsPreservingPayments(tx, [listing], userId);
    });

    // Remove from Meilisearch index (fire-and-forget)
    this.search.removeListing(id).catch(() => {});

    return { message: 'Listing permanently deleted.' };
  }

  // ─── Renew / Bump ──────────────────────────────────────────────────────────

  private static readonly BUMP_COOLDOWN_DAYS = 7;
  private static readonly MAX_RENEWALS = 5;

  async renew(id: string, userId: string) {
    const listing = await this.findOneOrFail(id);
    if (listing.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    if (![ListingStatus.PUBLISHED, ListingStatus.EXPIRED].includes(listing.status as any)) {
      throw new BadRequestException('Only published or expired listings can be renewed');
    }

    // Enforce max renewals
    if (listing.renewalCount >= ListingsService.MAX_RENEWALS) {
      throw new BadRequestException(
        `Maximum renewals reached (${ListingsService.MAX_RENEWALS}). Create a new listing instead.`,
      );
    }

    // Enforce cooldown (skip for expired listings — always allow re-activating)
    if (listing.status !== ListingStatus.EXPIRED && listing.bumpedAt) {
      const cooldownMs = ListingsService.BUMP_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const nextBumpAt = new Date(listing.bumpedAt.getTime() + cooldownMs);
      if (Date.now() < nextBumpAt.getTime()) {
        throw new BadRequestException(
          `You can renew again after ${nextBumpAt.toISOString().split('T')[0]}`,
        );
      }
    }

    const policy = await runtimeSettings(this.prisma);
    const expiresAt = new Date(Date.now() + Number(policy.listing_expiry_days) * 86400000);
    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    const spamScore = await this.spamScoring.score(listing.title, listing.description);
    let status: ListingStatus = owner && (owner.trustScore >= 40 || policy.auto_approve_listings === 'true') && owner.postingStatus !== PostingStatus.REQUIRES_APPROVAL && spamScore < 50
      ? ListingStatus.PUBLISHED : ListingStatus.PENDING_REVIEW;
    if (Number(policy.spam_threshold_auto_reject) > 0 && spamScore >= Number(policy.spam_threshold_auto_reject)) status = ListingStatus.REJECTED;

    return this.updateUnchangedListing(listing, {
      where: { id },
      data: {
        expiresAt,
        status,
        bumpedAt: new Date(),
        renewalCount: { increment: 1 }, spamScore,
      },
      select: { id: true, status: true, expiresAt: true, bumpedAt: true, renewalCount: true },
    });
  }

  // ─── Report ────────────────────────────────────────────────────────────────

  async report(id: string, dto: ReportListingDto, userId: string) {
    const listing = await this.findOneOrFail(id);
    if (!isPublicListing(listing)) throw new NotFoundException('Listing not found');

    await this.prisma.listingReport.createMany({ data: [{ listingId: id, reporterId: userId, reason: dto.reason, details: dto.details }], skipDuplicates: true });
    const report = await this.prisma.listingReport.findUniqueOrThrow({ where: { listingId_reporterId: { listingId: id, reporterId: userId } } });
    return { reported: true, reportId: report.id };
  }

  // ─── Contact ───────────────────────────────────────────────────────────────

  async contact(id: string, dto: ContactListingDto, ip: string) {
    return this.recordEngagement(id, ip, dto.contactType);
  }

  async view(id: string, ip: string) { return this.recordEngagement(id, ip); }

  private async recordEngagement(id: string, ip: string, contactType?: ContactListingDto['contactType']) {
    const ipHash = createHash('sha256').update(ip || 'unknown').digest('hex');
    const key = `listing:${id}:${contactType ?? 'view'}:${ipHash}`;
    return serializableTransaction(this.prisma, async tx => {
      if (!await tx.listing.findFirst({ where: { ...publicListingWhere(), id }, select: { id: true } })) throw new NotFoundException('Listing not found');
      const claimed = await tx.$executeRaw`INSERT INTO event_claims(key, expires_at) VALUES (${key}, now()+interval '1 hour')
        ON CONFLICT (key) DO UPDATE SET expires_at=EXCLUDED.expires_at WHERE event_claims.expires_at <= now()`;
      if (!claimed) return { success: true, counted: false };
      if (contactType) await tx.listingContact.create({ data: { listingId: id, contactType, ipHash } });
      await tx.listing.update({ where: { id }, data: contactType ? { contactClicks: { increment: 1 } } : { viewsCount: { increment: 1 } } });
      return { success: true, counted: true };
    });
  }

  // ─── Sitemap ─────────────────────────────────────────────────────────────

  async findForSitemap(page = 1, limit = 5000) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: publicListingWhere(),
        select: { id: true, slug: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where: publicListingWhere() }),
    ]);
    return { items, total, pages: Math.ceil(total / limit) };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findOneOrFail(id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing || listing.deletedAt) throw new NotFoundException('Listing not found');
    return listing;
  }

  private assertOwnerOrAdmin(ownerId: string | null, userId: string, role: Role) {
    if (ownerId !== userId && role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Not allowed');
    }
  }

  private assertOwner(ownerId: string | null, userId: string) {
    if (!ownerId || ownerId !== userId) throw new ForbiddenException('Not allowed');
  }

  async findForManagement(id: string, userId: string, role: Role) {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: LISTING_INCLUDE });
    if (!listing || listing.deletedAt) throw new NotFoundException('Listing not found');
    this.assertOwnerOrAdmin(listing.userId, userId, role);
    return listing;
  }

  private async updateUnchangedListing<T extends Prisma.ListingUpdateArgs>(
    listing: { id: string; updatedAt: Date; status: ListingStatus; userId: string | null }, args: T, client: Prisma.TransactionClient = this.prisma,
  ) {
    try {
      return await client.listing.update({ ...args, where: {
        id: listing.id, updatedAt: listing.updatedAt, status: listing.status, userId: listing.userId, deletedAt: null,
      } } as T);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') throw new ConflictException('Listing changed. Reload it before trying again.');
      throw error;
    }
  }

  private assertPromotionUnchanged(dto: { isFeatured?: boolean; isUrgent?: boolean }, listing?: { isFeatured: boolean; isUrgent: boolean }) {
    for (const field of ['isFeatured', 'isUrgent'] as const) {
      if (dto[field] !== undefined && dto[field] !== (listing?.[field] ?? false)) {
        throw new ForbiddenException('Promotion must be activated by an administrator');
      }
    }
  }

  private async assertCompanyAccess(companyId: string | null | undefined, userId: string, client: Prisma.TransactionClient = this.prisma) {
    if (!companyId) return;
    const company = await client.company.findUnique({ where: { id: companyId }, select: { ownerId: true } });
    if (!company || company.ownerId !== userId) throw new ForbiddenException('You can only post for your own company');
  }

  private async validateListingDetails(categoryId: number, subcategoryId: number | null | undefined, cityId: number, attributes: Record<string, unknown>, client: Prisma.TransactionClient = this.prisma) {
    const [category, subcategory, city] = await Promise.all([
      client.category.findUnique({ where: { id: categoryId } }),
      subcategoryId ? client.category.findUnique({ where: { id: subcategoryId } }) : null,
      client.city.findUnique({ where: { id: cityId } }),
    ]);
    if (!category || !category.isActive || category.parentId !== null) throw new BadRequestException('Select an active parent category');
    if (subcategoryId && (!subcategory || !subcategory.isActive || subcategory.parentId !== categoryId)) {
      throw new BadRequestException('Subcategory must belong to the selected category');
    }
    if (!city) throw new BadRequestException('City not found');
    const childSchema = subcategory?.attributeSchema as { fields?: unknown[] } | undefined;
    this.validateAttributes(attributes, childSchema?.fields ? childSchema : category.attributeSchema);
  }

  // ─── Attribute Validation ────────────────────────────────────────────────

  private validateAttributes(attributes: Record<string, unknown>, schema: any) {
    if (!schema || typeof schema !== 'object') return;

    const fields = schema.fields;
    if (!Array.isArray(fields) || fields.length === 0) return;

    const errors: string[] = [];

    for (const field of fields) {
      const fieldId = field.name ?? field.key;
      const value = attributes[fieldId];

      // Check required
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldId} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type checks
      switch (field.type) {
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${fieldId} must be a number`);
          } else {
            if (field.min !== undefined && value < field.min) {
              errors.push(`${fieldId} must be at least ${field.min}`);
            }
            if (field.max !== undefined && value > field.max) {
              errors.push(`${fieldId} must be at most ${field.max}`);
            }
          }
          break;

        case 'text':
          if (typeof value !== 'string') {
            errors.push(`${fieldId} must be a string`);
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${fieldId} must be a boolean`);
          }
          break;

        case 'select':
          if (field.options) {
            const validValues = field.options.map((o: any) =>
              typeof o === 'string' ? o : o.value,
            );
            if (!validValues.includes(value)) {
              errors.push(`${fieldId} must be one of: ${validValues.join(', ')}`);
            }
          }
          break;

        case 'multi_select':
          if (!Array.isArray(value)) {
            errors.push(`${fieldId} must be an array`);
          } else if (field.options) {
            const validValues = field.options.map((o: any) =>
              typeof o === 'string' ? o : o.value,
            );
            for (const v of value) {
              if (!validValues.includes(v)) {
                errors.push(`${fieldId} contains invalid value: ${v}`);
              }
            }
          }
          break;

        case 'date':
          if (typeof value !== 'string' || isNaN(Date.parse(value as string))) {
            errors.push(`${fieldId} must be a valid date string`);
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Attribute validation failed',
        errors,
      });
    }
  }
}
