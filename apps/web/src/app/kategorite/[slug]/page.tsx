import { serializeJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingCard from '@/components/listings/ListingCard';
import ListingListItem from '@/components/listings/ListingListItem';
import ViewToggle, { type ViewMode } from '@/components/listings/ViewToggle';
import FilterPanel from '@/components/filters/FilterPanel';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/search/SearchBar';
import AdZone from '@/components/ads/AdZone';
import { getListings, getCategories } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return { title: 'Kategoria nuk u gjet' };
  return {
    title: `${category.name} — Shpallje në Kosovë`,
    description: `Shpalljet e ${category.name} në Kosovë. Gjeni ofertat më të mira.`,
    alternates: { canonical: `/kategorite/${slug}` },
    openGraph: {
      title: `${category.name} — Oferta Suksesi`,
      description: `Shfletoni shpalljet e ${category.name} në Kosovë.`,
    },
  };
}

function sp1(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const requestedPage = Number(sp1(sp, 'page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const subcategory = sp1(sp, 'subcategory');
  const city        = sp1(sp, 'city');
  const price_min   = sp1(sp, 'price_min');
  const price_max   = sp1(sp, 'price_max');
  const has_photos  = sp1(sp, 'has_photos') === 'true';
  const isFeatured  = sp1(sp, 'isFeatured') === 'true';
  const sort        = sp1(sp, 'sort') ?? 'newest';
  const view        = (sp1(sp, 'view') === 'list' ? 'list' : 'grid') as ViewMode;

  // Fetch subcategories for this category
  const allCategories = await getCategories();
  const apiCategory = allCategories.find((c) => c.slug === slug);
  const subcategories = (apiCategory?.children ?? []).map((sc) => ({
    id: sc.id,
    name: sc.name,
    slug: sc.slug,
  }));

  const { data: listings, meta } = await getListings({
    category: slug,
    ...(sp1(sp, 'q') ? { q: sp1(sp, 'q') } : {}),
    ...(subcategory ? { subcategory }                  : {}),
    ...(city        ? { city }                         : {}),
    ...(price_min   ? { price_min: Number(price_min) } : {}),
    ...(price_max   ? { price_max: Number(price_max) } : {}),
    ...(has_photos  ? { has_photos: true }              : {}),
    ...(isFeatured  ? { isFeatured: true }              : {}),
    sort,
    page,
    limit: 20,
  });

  // Pin featured/urgent to top of first page only
  const pinned = page === 1 && sort === 'newest' ? listings.filter((l) => l.isFeatured || l.isUrgent)   : [];
  const rest   = page === 1 && sort === 'newest' ? listings.filter((l) => !l.isFeatured && !l.isUrgent) : listings;
  const ordered = [...pinned, ...rest];

  const currentFilters = {
    city:        city ?? '',
    price_min:   price_min ?? '',
    price_max:   price_max ?? '',
    has_photos,
    isFeatured,
    sort,
    subcategory: subcategory ?? '',
  };

  // Schema.org ItemList
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} — Shpallje`,
    numberOfItems: meta.total,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * 20 + i + 1,
      name: l.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Fillimi', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: category.name },
          ]
        })}}
      />

      {/* Search bar */}
      <div className="bg-linear-to-br from-primary-dark to-primary-light px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <SearchBar
            initialCategory={slug}
          />
        </div>
      </div>

      {/* Ad: full-width banner right under search */}
      <div className="flex justify-center px-4 py-3 bg-gray-50/50">
        <AdZone slug="category-top" categoryId={category.id} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Breadcrumb + heading + toggle — all compact */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <nav aria-label="Vendndodhja në faqe" className="text-xs text-gray-400 flex items-center gap-1">
              <a href="/" className="hover:text-accent transition-colors">Fillimi</a>
              <span aria-hidden="true">›</span>
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{category.icon}</span>
              <h1 className="text-base font-bold text-dark">{category.name}</h1>
              <span className="text-xs text-gray-400">({meta.total})</span>
            </div>
          </div>
          <ViewToggle current={view} />
        </div>

        <div className="flex gap-6 items-start">
          {/* Desktop sidebar (FilterPanel handles mobile view internally) */}
          <FilterPanel initialFilters={currentFilters} subcategories={subcategories} categorySlug={slug} sidebarExtra={<AdZone slug="category-sidebar" categoryId={category.id} labeled />} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {ordered.length > 0 ? (
              <>
                {pinned.length > 0 && page === 1 && (
                  <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                    Shpalljet e Zgjedhura
                  </p>
                )}

                {view === 'grid' ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(page === 1 ? ordered.slice(0, 6) : ordered).map((listing) => (
                        <ListingCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                    {page === 1 && ordered.length > 6 && (
                      <>
                        <div className="flex justify-center my-3">
                          <AdZone slug="category-inline" categoryId={category.id} labeled />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {ordered.slice(6).map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(page === 1 ? ordered.slice(0, 6) : ordered).map((listing) => (
                        <ListingListItem key={listing.id} listing={listing} />
                      ))}
                    </div>
                    {page === 1 && ordered.length > 6 && (
                      <>
                        <div className="flex justify-center my-3">
                          <AdZone slug="category-inline" categoryId={category.id} labeled />
                        </div>
                        <div className="space-y-2">
                          {ordered.slice(6).map((listing) => (
                            <ListingListItem key={listing.id} listing={listing} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                />
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-base mb-2">Nuk ka shpallje për këtë kërkim.</p>
                <p className="text-sm">Provo të heqësh disa filtra ose zgjidh kategori tjetër.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
