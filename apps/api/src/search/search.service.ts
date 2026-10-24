import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';
import { publicListingWhere } from '../listings/listing-visibility';

const INDEX_NAME = 'listings';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private index: Index;
  private configured = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new MeiliSearch({
      host: this.config.get<string>('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: this.config.get<string>('MEILISEARCH_KEY', 'dev_master_key'),
    });
    this.index = this.client.index(INDEX_NAME);
  }

  async onModuleInit() {
    try { await this.configure(); } catch { this.logger.warn('Search unavailable; background delivery will retry'); }
  }
  async configure() {
    if (this.configured) return;
    const task = await this.client.tasks.waitForTask(await this.index.updateSettings({
      searchableAttributes: ['title','description','categoryName','cityName'],
      filterableAttributes: ['status','categoryName','cityName','isFeatured','isUrgent'],
      sortableAttributes: ['createdAt','price'],
    }), { timeout: 10000 });
    if (task.status !== 'succeeded') throw new Error('Search settings failed');
    this.configured = true;
  }
  async pruneOrphans() {
    await this.configure();
    let offset = 0;
    while (true) {
      const result = await this.index.getDocuments<{ id: string }>({ fields: ['id'], limit: 500, offset });
      const ids = result.results.map(row => row.id);
      if (!ids.length) return;
      const visible = new Set((await this.prisma.listing.findMany({ where: { ...publicListingWhere(), id: { in: ids } }, select: { id: true } })).map(row => row.id));
      const stale = ids.filter(id => !visible.has(id));
      if (stale.length) {
        const task = await this.client.tasks.waitForTask(await this.index.deleteDocuments(stale), { timeout: 30000 });
        if (task.status !== 'succeeded') throw new Error('Search cleanup failed');
      }
      if (ids.length < 500) return;
      offset += ids.length-stale.length;
    }
  }

  // ─── Index a single listing ──────────────────────────────────────────────────

  async indexListing(listing: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category?: { name: string } | null;
    city?: { name: string } | null;
    attributes?: any;
    status: string;
    isFeatured: boolean;
    isUrgent: boolean;
    createdAt: Date;
    images?: { thumbUrl?: string | null; isPrimary?: boolean }[];
  }) {
    await this.configure();
    const doc = {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      categoryName: listing.category?.name ?? '',
      cityName: listing.city?.name ?? '',
      price: listing.attributes?.price ?? null,
      status: listing.status,
      isFeatured: listing.isFeatured,
      isUrgent: listing.isUrgent,
      createdAt: listing.createdAt.getTime(),
      thumbUrl: listing.images?.find((i) => i.isPrimary)?.thumbUrl ?? listing.images?.[0]?.thumbUrl ?? null,
    };

    const task = await this.client.tasks.waitForTask(await this.index.addDocuments([doc]), { timeout: 30000 });
    if (task.status !== 'succeeded') throw new Error('Search indexing task failed');
  }

  // ─── Remove a listing from the index ─────────────────────────────────────────

  async removeListing(id: string) {
    const task = await this.client.tasks.waitForTask(await this.index.deleteDocument(id), { timeout: 30000 });
    if (task.status !== 'succeeded') throw new Error('Search deletion task failed');
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  async search(
    query: string,
    options?: {
      category?: string;
      city?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, Math.min(1000, Number.isFinite(options?.page) ? Math.trunc(options!.page!) : 1));
    const limit = Math.max(1, Math.min(50, Number.isFinite(options?.limit) ? Math.trunc(options!.limit!) : 20));

    const filter: string[] = ['status = PUBLISHED'];
    if (options?.category) filter.push(`categoryName = ${JSON.stringify(options.category)}`);
    if (options?.city) filter.push(`cityName = ${JSON.stringify(options.city)}`);

    const result = await this.index.search(query, {
      filter,
      offset: (page - 1) * limit,
      limit,
      sort: ['createdAt:desc'],
    });

    // Search indexing is asynchronous. Re-read matching rows to avoid exposing stale/private content.
    const listings = await this.prisma.listing.findMany({
      where: { ...publicListingWhere(), id: { in: result.hits.map(hit => String(hit.id)) } },
      include: { category: true, city: true, images: { where: { isPrimary: true }, take: 1 } },
    });
    const byId = new Map(listings.map(listing => [listing.id, listing]));
    const data = result.hits.flatMap(hit => {
      const listing = byId.get(String(hit.id));
      return listing ? [{
        id: listing.id, slug: listing.slug, title: listing.title, description: listing.description,
        categoryName: listing.category.name, cityName: listing.city.name,
        price: (listing.attributes as any)?.price ?? null, status: listing.status,
        isFeatured: listing.isFeatured, isUrgent: listing.isUrgent,
        createdAt: listing.createdAt.getTime(), thumbUrl: listing.images[0]?.thumbUrl ?? null,
      }] : [];
    });
    return {
      data,
      meta: {
        total: result.estimatedTotalHits ?? 0,
        page,
        limit,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
      },
    };
  }

  // ─── Full sync ───────────────────────────────────────────────────────────────

  async syncAll() {
    const queued = await this.prisma.$executeRaw`INSERT INTO outbox_events(id,topic,payload)
      SELECT gen_random_uuid()::text,'search.listing',jsonb_build_object('listingId',id) FROM listings`;
    await this.pruneOrphans();
    return { queued, message: 'Search refresh queued; delivery status is available in operations' };
  }
}
