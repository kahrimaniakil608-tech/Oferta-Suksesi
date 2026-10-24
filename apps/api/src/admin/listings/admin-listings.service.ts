import { attachListingImages } from '../../media/asset-ownership';
import { runtimeSettings } from '../settings/admin-settings.service';
import { deletionTransaction, deleteListingsPreservingPayments } from '../../listings/delete-listings';
import {
  BadRequestException,
  ConflictException,
  Logger,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingStatus, Prisma } from '@prisma/client';
import { serializableTransaction } from '../../prisma/serializable-transaction';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUpdateListingDto } from './dto/admin-update-listing.dto';
import { BulkActionDto, BulkListingAction } from './dto/bulk-action.dto';
import { CreateAdminListingDto } from './dto/create-admin-listing.dto';
import {
  ListAdminListingsDto,
  ListingAdminSortOption,
} from './dto/list-listings.dto';
import { RejectListingDto } from './dto/reject-listing.dto';

// ─── Admin include presets ─────────────────────────────────────────────────────

const ADMIN_LIST_INCLUDE = {
  images: {
    where: { isPrimary: true },
    take:  1,
    orderBy: { position: 'asc' as const },
  },
  category: { select: { id: true, name: true, slug: true } },
  city:     { select: { id: true, name: true, slug: true } },
  user: {
    select: {
      id:         true,
      name:       true,
      email:      true,
      trustScore: true,
      postingStatus: true,
      badges: {
        select: {
          badge: { select: { id: true, name: true, label: true, icon: true, color: true } },
        },
      },
    },
  },
} as const;

const ADMIN_DETAIL_INCLUDE = {
  images:   { orderBy: { position: 'asc' as const } },
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  city:     { select: { id: true, name: true, slug: true, region: true } },
  user: {
    select: {
      id:            true,
      name:          true,
      email:         true,
      trustScore:    true,
      isVerified:    true,
      postingStatus: true,
      badges: {
        select: {
          badge: { select: { id: true, name: true, label: true, icon: true, color: true } },
        },
      },
    },
  },
  company:        { select: { id: true, name: true, slug: true } },
  moderationLogs: { orderBy: { createdAt: 'desc' as const } },
  contacts: true,
} as const;

@Injectable()
export class AdminListingsService {
  private readonly redis: Redis;
  private readonly logger = new Logger(AdminListingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrFail(id: string, client: Prisma.TransactionClient = this.prisma) {
    const listing = await client.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  private async logAction(params: {
    listingId: string;
    action:    string;
    reason?:   string;
    moderatorId?: string;
  }): Promise<void> {
    await this.prisma.moderationLog.create({
      data: {
        listingId:   params.listingId,
        action:      params.action,
        reason:      params.reason,
        moderatorId: params.moderatorId,
        spamScore:   0,
      },
    });
  }

  // ─── Create Manual ────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text.toLowerCase()
      .replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/ä/g, 'a').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  async createManual(dto: CreateAdminListingDto, adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
      await tx.$executeRaw`SELECT set_config('oferta.actor_id', ${adminId}, true)`;
    const { imageUrls = [], images, notes, source, contactPhone, ...listingFields } = dto;

    // Generate a unique slug from title
    const baseSlug = this.slugify(listingFields.title);
    const suffix   = Date.now().toString(36);
    const slug     = `${baseSlug}-${suffix}`;

    // Default expiry: 60 days from now
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    // Prefer rich image objects over plain URL list
    const imageRecords = images && images.length > 0
      ? images.map((img, i) => ({
          url:       img.url,
          thumbUrl:  img.thumbUrl,
          mediumUrl: img.mediumUrl,
          position:  i,
          isPrimary: i === 0,
        }))
      : imageUrls.map((url, i) => ({
          url,
          thumbUrl:  url,
          mediumUrl: url,
          position:  i,
          isPrimary: i === 0,
        }));

    await attachListingImages(tx, imageRecords, adminId, undefined, true);
    const listing = await tx.listing.create({
      data: {
        ...listingFields,
        slug,
        expiresAt,
        status:     ListingStatus.PUBLISHED,
        attributes: (listingFields.attributes ?? {}) as any,
        images: imageRecords.length > 0
          ? { create: imageRecords }
          : undefined,
      },
      include: ADMIN_DETAIL_INCLUDE,
    });

    const noteText = [
      `Shpallje e shtuar manualisht nga admini`,
      `Burimi: ${source}`,
      contactPhone ? `Tel kontakti: ${contactPhone}` : null,
      notes ?? null,
    ].filter(Boolean).join(' | ');

    await tx.moderationLog.create({ data: {
      listingId:   listing.id,
      action:      'ADMIN_MANUAL_CREATE',
      reason:      noteText,
      moderatorId: adminId,
    } });

    return listing;
    });
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(dto: ListAdminListingsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      category,
      city,
      userId,
      companyId,
      isFeatured,
      isUrgent,
      hasImages,
      sort = ListingAdminSortOption.NEWEST,
      dateFrom,
      dateTo,
      isDeleted,
    } = dto;

    const skip  = (page - 1) * limit;
    const where: any = {};

    // Soft-delete filter
    if (isDeleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    // Status — supports comma-separated list
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()) as ListingStatus[];
      if (statuses.some(value => !Object.values(ListingStatus).includes(value))) throw new BadRequestException('Invalid listing status');
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    if (search) {
      // Normalize phone search: strip spaces, dashes, parens for flexible matching
      const normalized = search.replace(/[\s\-().]/g, '');
      const isPhoneSearch = /^\+?\d{6,}$/.test(normalized);
      const phoneVariant = isPhoneSearch ? normalized : null;

      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { guestName:     { contains: search, mode: 'insensitive' } },
        { guestPhone:    { contains: search, mode: 'insensitive' } },
        { guestEmail:    { contains: search, mode: 'insensitive' } },
        ...(phoneVariant ? [
          { user: { phone: { contains: phoneVariant, mode: 'insensitive' as const } } },
          { guestPhone:    { contains: phoneVariant, mode: 'insensitive' as const } },
        ] : []),
      ];
    }
    if (category)  where.category  = { slug: category };
    if (city)      where.city      = { slug: city };
    if (userId)    where.userId    = userId;
    if (companyId) where.companyId = companyId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isUrgent   !== undefined) where.isUrgent   = isUrgent;
    if (hasImages)                where.images = { some: {} };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    let orderBy: any;
    switch (sort) {
      case ListingAdminSortOption.OLDEST:    orderBy = { createdAt:    'asc'  }; break;
      case ListingAdminSortOption.VIEWS:     orderBy = { viewsCount:   'desc' }; break;
      case ListingAdminSortOption.SPAM_SCORE: orderBy = [{ spamScore: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }]; break;
      case ListingAdminSortOption.CONTACTS:  orderBy = { contactClicks:'desc' }; break;
      default:                               orderBy = { createdAt:    'desc' }; break;
    }

    const [data, total, statusGroups] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: ADMIN_LIST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
      this.prisma.listing.groupBy({
        by:      ['status'],
        where:   { deletedAt: null },
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const statusCounts = statusGroups.reduce<Record<string, number>>(
      (acc, r) => { acc[r.status] = r._count.id; return acc; },
      {},
    );

    const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const deletedCount = await this.prisma.listing.count({ where: { deletedAt: { not: null } } });
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts: {
          ALL: allCount,
          ...statusCounts,
          DELETED: deletedCount,
        },
      },
    };
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where:   { id },
      include: ADMIN_DETAIL_INCLUDE,
    });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: AdminUpdateListingDto, adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
      await tx.$executeRaw`SELECT set_config('oferta.actor_id', ${adminId}, true)`;
    await this.findOrFail(id, tx);

    const { reason, ...fields } = dto;

    const updated = await tx.listing.update({
      where: { id },
      data:  {
        ...(fields.title       !== undefined && { title:       fields.title }),
        ...(fields.description !== undefined && { description: fields.description }),
        ...(fields.categoryId    !== undefined && { categoryId:    fields.categoryId }),
        ...(fields.subcategoryId !== undefined && { subcategoryId: fields.subcategoryId }),
        ...(fields.cityId        !== undefined && { cityId:        fields.cityId }),
        ...(fields.attributes  !== undefined && { attributes:  fields.attributes as any }),
        ...(fields.isFeatured  !== undefined && { isFeatured:  fields.isFeatured }),
        ...(fields.isUrgent    !== undefined && { isUrgent:    fields.isUrgent }),
        ...(fields.status      !== undefined && { status:      fields.status }),
        ...(fields.expiresAt   !== undefined && { expiresAt:   new Date(fields.expiresAt) }),
      },
      include: ADMIN_DETAIL_INCLUDE,
    });

    await tx.moderationLog.create({ data: {
      listingId:   id,
      action:      'ADMIN_EDIT',
      reason:      reason ?? 'Admin edit',
      moderatorId: adminId,
    } });

    return updated;
    });
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string, reason?: string) {
    const listing = await this.findOrFail(id);
    if (listing.deletedAt) throw new BadRequestException('Listing is already deleted');

    await this.prisma.listing.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    await this.logAction({
      listingId:   id,
      action:      'ADMIN_SOFT_DELETE',
      reason:      reason ?? 'Deleted by admin',
      moderatorId: adminId,
    });

    return { message: 'Listing soft-deleted.' };
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  async restore(id: string, adminId: string, status?: ListingStatus) {
    const listing = await this.findOrFail(id);
    if (!listing.deletedAt) throw new BadRequestException('Listing is not deleted');

    const restoredStatus = status ?? ListingStatus.PUBLISHED;

    await this.prisma.listing.update({
      where: { id },
      data:  { deletedAt: null, status: restoredStatus },
    });

    await this.logAction({
      listingId:   id,
      action:      'ADMIN_RESTORE',
      reason:      `Restored to ${restoredStatus}`,
      moderatorId: adminId,
    });

    return { message: `Listing restored with status ${restoredStatus}.` };
  }

  // ─── Approve ──────────────────────────────────────────────────────────────

  async approve(id: string, adminId: string) {
    const expected = await this.findOrFail(id);
    if (expected.deletedAt || expected.status !== ListingStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only visible PENDING_REVIEW listings can be approved');
    }
    const result = await serializableTransaction(this.prisma, async tx => {
      const listing = await this.requireUnchangedDecision(tx, expected);
      const policy = await runtimeSettings(tx as any);
      if (policy.require_image_to_publish === 'true' && !await tx.listingImage.count({ where: { listingId: id } })) throw new BadRequestException('At least one image is required');
      let scoreIncrement = 0;
      if (listing.userId) {
        const owner = await tx.user.findUnique({ where: { id: listing.userId } });
        if (!owner || owner.deletedAt || owner.suspendedAt) throw new BadRequestException('Listing owner is unavailable');
        const publishedCount = await tx.listing.count({ where: {
          userId: listing.userId, status: ListingStatus.PUBLISHED, id: { not: id },
        } });
        scoreIncrement = Number(publishedCount === 0 ? policy.trust_score_first_listing : policy.trust_score_subsequent);
      }
      await tx.listing.update({ where: { id }, data: { status: ListingStatus.PUBLISHED, bumpedAt: new Date() } });
      if (listing.userId) await tx.user.update({ where: { id: listing.userId }, data: { trustScore: { increment: scoreIncrement } } });
      await tx.moderationLog.create({ data: { listingId: id, action: 'APPROVED', moderatorId: adminId } });
      return { listing, scoreIncrement };
    });
    await this.publishModerationEvent('listing.approved', {
      listingId: id, userId: result.listing.userId, isGuestListing: result.listing.isGuestListing, scoreIncrement: result.scoreIncrement,
    });
    return { message: 'Listing approved.', scoreIncrement: result.scoreIncrement, isGuestListing: result.listing.isGuestListing };
  }

  // ─── Reject ───────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectListingDto, adminId: string) {
    const expected = await this.findOrFail(id);
    if (expected.deletedAt || expected.status === ListingStatus.REJECTED || expected.status === ListingStatus.ARCHIVED) {
      throw new BadRequestException('Listing is deleted, archived or already rejected');
    }
    const listing = await serializableTransaction(this.prisma, async tx => {
      const current = await this.requireUnchangedDecision(tx, expected);
      await tx.listing.update({ where: { id }, data: { status: ListingStatus.REJECTED } });
      if (current.userId) await tx.user.update({ where: { id: current.userId }, data: { trustScore: { decrement: Number((await runtimeSettings(tx as any)).trust_score_reject_penalty) } } });
      await tx.moderationLog.create({ data: { listingId: id, action: 'REJECTED', reason: dto.reason, moderatorId: adminId } });
      return current;
    });
    await this.publishModerationEvent('listing.rejected', { listingId: id, userId: listing.userId, reason: dto.reason });
    return { message: 'Listing rejected.' };
  }

  private async requireUnchangedDecision(tx: Prisma.TransactionClient, expected: { id: string; status: ListingStatus; updatedAt: Date }) {
    const listing = await tx.listing.findUnique({ where: { id: expected.id } });
    if (!listing || listing.deletedAt || listing.status !== expected.status || listing.updatedAt.getTime() !== expected.updatedAt.getTime()) {
      throw new ConflictException('This listing changed while you were reviewing it. Reload before deciding.');
    }
    return listing;
  }

  private async publishModerationEvent(_channel: string, _event: Record<string, unknown>) {
    // The listing transaction's database trigger already persisted durable delivery.
  }

  // ─── Toggle Feature ───────────────────────────────────────────────────────

  async toggleFeature(id: string, adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
      await tx.$executeRaw`SELECT set_config('oferta.actor_id', ${adminId}, true)`;
    const listing = await this.findOrFail(id, tx);
    const isFeatured = !listing.isFeatured;

    await tx.listing.update({ where: { id }, data: { isFeatured } });

    await tx.moderationLog.create({ data: {
      listingId:   id,
      action:      isFeatured ? 'FEATURED' : 'UNFEATURED',
      moderatorId: adminId,
    } });

    return { isFeatured };
    });
  }

  // ─── Toggle Urgent ────────────────────────────────────────────────────────

  async toggleUrgent(id: string, adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
      await tx.$executeRaw`SELECT set_config('oferta.actor_id', ${adminId}, true)`;
    const listing = await this.findOrFail(id, tx);
    const isUrgent = !listing.isUrgent;

    await tx.listing.update({ where: { id }, data: { isUrgent } });

    await tx.moderationLog.create({ data: {
      listingId:   id,
      action:      isUrgent ? 'MARKED_URGENT' : 'UNMARKED_URGENT',
      moderatorId: adminId,
    } });

    return { isUrgent };
    });
  }

  // ─── Bulk Action ──────────────────────────────────────────────────────────

  async bulkAction(dto: BulkActionDto, adminId: string) {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const listingId of dto.listingIds) {
      try {
        switch (dto.action) {
          case BulkListingAction.APPROVE:
            await this.approve(listingId, adminId);
            break;
          case BulkListingAction.REJECT:
            await this.reject(listingId, { reason: dto.reason ?? 'Bulk reject' }, adminId);
            break;
          case BulkListingAction.DELETE:
            await this.softDelete(listingId, adminId, dto.reason);
            break;
          case BulkListingAction.FEATURE:
            await this.update(listingId, { isFeatured: true }, adminId);
            break;
          case BulkListingAction.UNFEATURE:
            await this.prisma.listing.update({
              where: { id: listingId },
              data:  { isFeatured: false },
            });
            await this.logAction({ listingId, action: 'UNFEATURED', moderatorId: adminId });
            break;
          case BulkListingAction.ARCHIVE:
            await this.prisma.listing.update({
              where: { id: listingId },
              data:  { status: ListingStatus.ARCHIVED },
            });
            await this.logAction({ listingId, action: 'ARCHIVED', moderatorId: adminId });
            break;
          case BulkListingAction.RENEW:
            await this.adminBump(listingId, adminId);
            break;
          case BulkListingAction.PERMANENT_DELETE:
            await this.permanentDelete(listingId, adminId);
            break;
        }
        results.push({ id: listingId, success: true });
      } catch (err: any) {
        results.push({ id: listingId, success: false, error: err?.message });
      }
    }

    return {
      processed: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed:    results.filter((r) => !r.success).length,
      results,
    };
  }

  // ─── Assign Guest Listing to User ────────────────────────────────────────

  async assignGuestToUser(listingId: string, userId: string, adminId: string) {
    const listing = await this.findOrFail(listingId);

    if (!listing.isGuestListing) {
      throw new BadRequestException('Listing is not a guest listing');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        userId,
        isGuestListing: false,
        guestName: null,
        guestPhone: null,
        guestEmail: null,
      },
      include: ADMIN_DETAIL_INCLUDE,
    });

    await this.logAction({
      listingId,
      action: 'GUEST_ASSIGNED_TO_USER',
      reason: `Guest listing assigned to user ${user.name} (${user.email})`,
      moderatorId: adminId,
    });

    return updated;
  }

  // ─── Admin Bump ────────────────────────────────────────────────────────────

  async adminBump(id: string, adminId: string) {
    await this.findOrFail(id);

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        bumpedAt: new Date(),
        renewalCount: { increment: 1 },
      },
      select: { id: true, bumpedAt: true, renewalCount: true },
    });

    await this.logAction({
      listingId: id,
      action: 'ADMIN_BUMP',
      reason: 'Bumped to top by admin',
      moderatorId: adminId,
    });

    return updated;
  }

  // ─── Permanent Delete ─────────────────────────────────────────────────────

  async permanentDelete(id: string, adminId: string) {
    await deletionTransaction(this.prisma, async tx => {
      const listing = await tx.listing.findUnique({ where: { id } });
      if (!listing) throw new NotFoundException('Listing not found');
      if (!listing.deletedAt && listing.status !== ListingStatus.ARCHIVED) {
        throw new BadRequestException('Only soft-deleted or ARCHIVED listings can be permanently deleted');
      }
      await deleteListingsPreservingPayments(tx, [listing], adminId);
    });

    return { message: 'Listing permanently deleted.' };
  }

  // ─── Delete Single Image ──────────────────────────────────────────────────

  async deleteImage(listingId: string, imageId: string, adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
    await this.findOrFail(listingId, tx);

    const image = await tx.listingImage.findFirst({
      where: { id: imageId, listingId },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    await tx.listingImage.delete({ where: { id: imageId } });

    // Re-number remaining images so positions stay contiguous
    const remaining = await tx.listingImage.findMany({
      where: { listingId },
      orderBy: { position: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.listingImage.update({
        where: { id: remaining[i].id },
        data: { position: i, isPrimary: i === 0 },
      });
    }

    await tx.moderationLog.create({ data: {
      listingId,
      action: 'ADMIN_DELETE_IMAGE',
      reason: `Deleted image ${imageId}`,
      moderatorId: adminId,
    } });

    return { message: 'Image deleted.' };
    });
  }

  // ─── Reorder Images ────────────────────────────────────────────────────────

  async reorderImages(listingId: string, imageIds: string[], adminId: string) {
    return serializableTransaction(this.prisma, async tx => {
      const existing = await tx.listingImage.findMany({ where: { listingId } });
      const ids = new Set(existing.map(image => image.id));
      if (imageIds.length !== ids.size || new Set(imageIds).size !== imageIds.length || imageIds.some(id => !ids.has(id))) throw new BadRequestException('Supply every image of this listing exactly once');
      for (const [position, id] of imageIds.entries()) await tx.listingImage.update({ where: { id, listingId }, data: { position, isPrimary: position === 0 } });
      await tx.moderationLog.create({ data: { listingId, action: 'ADMIN_REORDER_IMAGES', moderatorId: adminId } });
      return tx.listingImage.findMany({ where: { listingId }, orderBy: { position: 'asc' } });
    });
  }

  // ─── Add Images to Existing Listing ─────────────────────────────────────────

  async addImages(
    listingId: string,
    images: { url: string; thumbUrl: string; mediumUrl: string }[],
    adminId: string,
  ) {
    return serializableTransaction(this.prisma, async tx => {
    await this.findOrFail(listingId, tx);

    if (images.length > 8) throw new BadRequestException('Maximum 8 images');
    const existing = await tx.listingImage.count({ where: { listingId } });

    if (existing + images.length > 8) throw new BadRequestException('Maximum 8 images');
    await attachListingImages(tx, images, adminId, listingId, true);
    const created = await Promise.all(
      images.map((img, i) =>
        tx.listingImage.create({
          data: {
            listingId,
            url: img.url,
            thumbUrl: img.thumbUrl,
            mediumUrl: img.mediumUrl,
            position: existing + i,
            isPrimary: existing === 0 && i === 0,
          },
        }),
      ),
    );

    await tx.moderationLog.create({ data: {
      listingId,
      action: 'ADMIN_ADD_IMAGES',
      reason: `Added ${images.length} image(s)`,
      moderatorId: adminId,
    } });

    return created;
    });
  }

  // ─── Empty Trash ────────────────────────────────────────────────────────────

  async emptyTrash(adminId: string) {
    const result = await deletionTransaction(this.prisma, async tx => {
      const listings = await tx.listing.findMany({
        where: { deletedAt: { not: null } }, select: { id: true, title: true, userId: true },
      });
      return deleteListingsPreservingPayments(tx, listings, adminId);
    });
    return { message: `${result.count} listings permanently deleted.`, count: result.count };
  }

  // ─── Moderation Queue ─────────────────────────────────────────────────────

  async getModerationQueue(page = 1, limit = 20, sort: 'newest' | 'oldest' | 'spam' = 'newest') {
    const where = { status: ListingStatus.PENDING_REVIEW, deletedAt: null };
    const total = await this.prisma.listing.count({ where });

    const orderBy = sort === 'spam' ? [{ spamScore: 'desc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }] : sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : { createdAt: 'desc' as const };

    const listings = await this.prisma.listing.findMany({
      where,
      include: {
        ...ADMIN_LIST_INCLUDE,
        moderationLogs: {
          orderBy: { createdAt: 'desc' },
          take:    5,
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Compute latest spam score from moderation logs
    let withScore = listings.map((l) => ({
      ...l,
      latestSpamScore: l.spamScore,
    }));

    // If sorting by spam, re-sort the page by spam score DESC
    if (sort === 'spam') {
      withScore.sort((a, b) => b.latestSpamScore - a.latestSpamScore || a.createdAt.getTime() - b.createdAt.getTime());
    }

    return {
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
      data: withScore,
    };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const now       = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalListings,
      newToday,
      newThisWeek,
      newThisMonth,
      byStatus,
      byCategory,
      byCity,
      avgPerUser,
    ] = await Promise.all([
      this.prisma.listing.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
      this.prisma.listing.count({ where: { createdAt: { gte: weekStart  }, deletedAt: null } }),
      this.prisma.listing.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
      this.prisma.listing.groupBy({
        by:      ['status'],
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.listing.groupBy({
        by:      ['categoryId'],
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
        take:    10,
      }),
      this.prisma.listing.groupBy({
        by:      ['cityId'],
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
        take:    10,
      }),
      this.prisma.listing.groupBy({
        by:      ['userId'],
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const avgListingsPerUser =
      avgPerUser.length > 0
        ? avgPerUser.reduce((sum, r) => sum + r._count.id, 0) / avgPerUser.length
        : 0;

    // Enrich categoryId / cityId with names
    const [categoryRows, cityRows] = await Promise.all([
      this.prisma.category.findMany({
        where:  { id: { in: byCategory.map((r) => r.categoryId) } },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.city.findMany({
        where:  { id: { in: byCity.map((r) => r.cityId) } },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const catMap  = Object.fromEntries(categoryRows.map((c) => [c.id, c]));
    const cityMap = Object.fromEntries(cityRows.map((c) => [c.id, c]));

    return {
      totalListings,
      newToday,
      newThisWeek,
      newThisMonth,
      byStatus: byStatus.reduce<Record<string, number>>(
        (acc, r) => { acc[r.status] = r._count.id; return acc; },
        {},
      ),
      topCategories: byCategory.map((r) => ({
        ...catMap[r.categoryId],
        count: r._count.id,
      })),
      topCities: byCity.map((r) => ({
        ...cityMap[r.cityId],
        count: r._count.id,
      })),
      avgListingsPerUser: Math.round(avgListingsPerUser * 100) / 100,
    };
  }
}
