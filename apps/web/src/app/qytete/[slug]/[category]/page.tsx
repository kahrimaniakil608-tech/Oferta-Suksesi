import { serializeJsonLd } from '@/lib/json-ld';
import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingCard from '@/components/listings/ListingCard';
import ListingListItem from '@/components/listings/ListingListItem';
import ViewToggle, { type ViewMode } from '@/components/listings/ViewToggle';
import FilterPanel from '@/components/filters/FilterPanel';
import Pagination from '@/components/ui/Pagination';
import AdZone from '@/components/ads/AdZone';
import { getCity, getListings, getCategories } from '@/lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ofertasuksesi.com';

interface PageProps {
  params: Promise<{ slug: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, category: catSlug } = await params;
  const city = await getCity(slug);
  const cat = (await getCategories()).find((c) => c.slug === catSlug);
  if (!city || !cat) return { title: 'Faqja nuk u gjet' };
  return {
    title: `${cat.name} ne ${city.name} — Shpallje ne Kosove`,
    description: `${cat.name} ne ${city.name}. Gjeni ofertat me te mira per ${cat.name.toLowerCase()} ne ${city.name}, Kosove.`,
    alternates: { canonical: `${SITE}/qytete/${city.slug}/${cat.slug}` },
    openGraph: {
      title: `${cat.name} ne ${city.name} — Oferta Suksesi`,
      description: `Shfletoni shpalljet e ${cat.name.toLowerCase()} ne ${city.name}.`,
      url: `${SITE}/qytete/${city.slug}/${cat.slug}`,
    },
  };
}

function sp1(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function CityCategoryPage({ params, searchParams }: PageProps) {
  const { slug, category: catSlug } = await params;
  const sp = await searchParams;

  const city = await getCity(slug);
  const cat = (await getCategories()).find((c) => c.slug === catSlug);
  if (!city || !cat) notFound();

  const requestedPage = Number(sp1(sp, 'page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const price_min  = sp1(sp, 'price_min');
  const price_max  = sp1(sp, 'price_max');
  const has_photos = sp1(sp, 'has_photos') === 'true';
  const isFeatured = sp1(sp, 'isFeatured') === 'true';
  const sort       = sp1(sp, 'sort') ?? 'newest';
  const view       = (sp1(sp, 'view') === 'list' ? 'list' : 'grid') as ViewMode;

  const { data: listings, meta } = await getListings({
    city: slug,
    ...(sp1(sp, 'q') ? { q: sp1(sp, 'q') } : {}),
    category: catSlug,
    ...(price_min  ? { price_min: Number(price_min) }  : {}),
    ...(price_max  ? { price_max: Number(price_max) }  : {}),
    ...(has_photos ? { has_photos: true }               : {}),
    ...(isFeatured ? { isFeatured: true }               : {}),
    sort,
    page,
    limit: 20,
  });

  const pinned = page === 1 && sort === 'newest' ? listings.filter((l) => l.isFeatured || l.isUrgent)   : [];
  const rest   = page === 1 && sort === 'newest' ? listings.filter((l) => !l.isFeatured && !l.isUrgent) : listings;
  const ordered = [...pinned, ...rest];

  const currentFilters = { subcategory: '',
    city:       slug,
    price_min:  price_min ?? '',
    price_max:  price_max ?? '',
    has_photos,
    isFeatured,
    sort,
  };

  // Schema.org BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Fillimi', item: SITE },
      { '@type': 'ListItem', position: 2, name: city.name, item: `${SITE}/qytete/${city.slug}` },
      { '@type': 'ListItem', position: 3, name: cat.name, item: `${SITE}/qytete/${city.slug}/${cat.slug}` },
    ],
  };

  // Schema.org ItemList
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.name} ne ${city.name}`,
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListSchema) }}
      />

      <div className="flex justify-center px-4 py-3 bg-gray-50/50">
        <AdZone slug="city-category-top" categoryId={cat.id} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Breadcrumb + heading + toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <nav aria-label="Vendndodhja në faqe" className="text-xs text-gray-400 flex items-center gap-1">
              <a href="/" className="hover:text-accent transition-colors">Fillimi</a>
              <span aria-hidden="true">&rsaquo;</span>
              <a href={`/qytete/${slug}`} className="hover:text-accent transition-colors">{city.name}</a>
              <span aria-hidden="true">&rsaquo;</span>
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{cat.icon}</span>
              <h1 className="text-base font-bold text-dark">{cat.name} ne {city.name}</h1>
              <span className="text-xs text-gray-400">({meta.total})</span>
            </div>
          </div>
          <ViewToggle current={view} />
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href={`/qytete/${slug}`}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            Te gjitha
          </a>
          {(await getCategories()).map((c) => (
            <a
              key={c.slug}
              href={`/qytete/${slug}/${c.slug}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                catSlug === c.slug ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.icon} {c.name}
            </a>
          ))}
        </div>

        <div className="flex gap-6 items-start">
          <FilterPanel initialFilters={currentFilters} categorySlug={catSlug} sidebarExtra={<AdZone slug="city-category-sidebar" categoryId={cat.id} labeled />} />

          <div className="flex-1 min-w-0">
            {ordered.length > 0 ? (
              <>
                {pinned.length > 0 && page === 1 && (
                  <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                    Shpalljet e Zgjedhura
                  </p>
                )}

                {view === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ordered.map((listing, idx) => (
                      <Fragment key={listing.id}>
                        <ListingCard listing={listing} />
                        {idx === 3 && page === 1 && (
                          <div className="col-span-2 sm:col-span-3 flex justify-center my-1">
                            <AdZone slug="city-category-inline" categoryId={cat.id} labeled />
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ordered.map((listing, idx) => (
                      <Fragment key={listing.id}>
                        <ListingListItem listing={listing} />
                        {idx === 5 && page === 1 && (
                          <div className="flex justify-center my-2">
                            <AdZone slug="city-category-inline" categoryId={cat.id} labeled />
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                )}

                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                />
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-base mb-2">Nuk ka shpallje per {cat.name.toLowerCase()} ne {city.name}.</p>
                <p className="text-sm">Provo te heqesh disa filtra ose zgjidh kategori tjeter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
