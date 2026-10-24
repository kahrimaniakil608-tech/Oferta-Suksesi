import { serverApiFetch } from '@/lib/server-fetch';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import ListingCard from '@/components/listings/ListingCard';
import FilterPanel from '@/components/filters/FilterPanel';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/search/SearchBar';
import AdZone from '@/components/ads/AdZone';
import ViewToggle from '@/components/listings/ViewToggle';
import type { ViewMode } from '@/components/listings/ViewToggle';
import { getListings, getCategories } from '@/lib/api';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface City { id: number; name: string; slug: string; region?: string | null }

async function getCities(): Promise<City[]> {
  try {
    const res = await serverApiFetch(`${API}/cities`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q  = typeof sp.q === 'string' ? sp.q : '';
  const cat = typeof sp.category === 'string' ? sp.category : '';
  const category = (await getCategories()).find((c) => c.slug === cat);

  const title = [q, category?.name].filter(Boolean).join(' — ') || 'Të gjitha shpalljet';
  return {
    title:       `${title} | Oferta Suksesi`,
    description: `Kërko shpallje${q ? ` për "${q}"` : ''} në Kosovë.`,
  };
}

function sp1(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShpalljetPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const q         = sp1(sp, 'q') ?? '';
  const category  = sp1(sp, 'category') ?? '';
  const city      = sp1(sp, 'city') ?? '';
  const sort      = sp1(sp, 'sort') ?? 'newest';
  const price_min = sp1(sp, 'price_min');
  const price_max = sp1(sp, 'price_max');
  const has_photos = sp1(sp, 'has_photos') === 'true';
  const isFeatured = sp1(sp, 'isFeatured') === 'true';
  const requestedPage = Number(sp1(sp, 'page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const view: ViewMode = sp1(sp, 'view') === 'list' ? 'list' : 'grid';

  const [{ data: listings, meta }, cities, categories] = await Promise.all([
    getListings({
      ...(q         ? { q }                          : {}),
      ...(category  ? { category }                   : {}),
      ...(city      ? { city }                       : {}),
      ...(price_min ? { price_min: Number(price_min) } : {}),
      ...(price_max ? { price_max: Number(price_max) } : {}),
      ...(has_photos ? { has_photos: true }          : {}),
      ...(isFeatured ? { isFeatured: true }          : {}),
      sort,
      page,
      limit: 20,
    }),
    getCities(),
    getCategories(),
  ]);

  const selectedCategory = categories.find((c) => c.slug === category);
  const currentFilters   = { subcategory: '', city, price_min: price_min ?? '', price_max: price_max ?? '', has_photos, isFeatured, sort };

  return (
    <>
      {/* Search bar */}
      <div className="bg-linear-to-br from-primary-dark to-primary-light px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <SearchBar
            initialQ={q}
            initialCategory={category}
            initialCity={city}
            cities={cities}
          />
        </div>
      </div>

      {/* Ad zone: top of search */}
      <AdZone slug="search-top" labeled className="px-4 py-3" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Heading */}
        <div className="mb-5 flex flex-wrap gap-3 items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-dark">
              {q ? (
                <>Rezultate për &ldquo;<span className="text-accent">{q}</span>&rdquo;</>
              ) : selectedCategory ? (
                <>{selectedCategory.icon} {selectedCategory.name}</>
              ) : (
                isFeatured ? 'Shpallje të veçuara' : 'Të gjitha shpalljet'
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {meta.total > 0
                ? `${meta.total.toLocaleString('sq-AL')} shpallje${city ? ` · ${city}` : ''}`
                : 'Nuk u gjetën shpallje'}
            </p>
          </div>
          <Suspense fallback={null}>
            <ViewToggle current={view} />
          </Suspense>
        </div>

        <div className="flex gap-6 items-start">
          <FilterPanel initialFilters={currentFilters} sidebarExtra={<AdZone slug="search-sidebar" labeled />} />

          <div className="flex-1 min-w-0">
            {listings.length > 0 ? (
              <>
                <div className={view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-2 sm:grid-cols-3 gap-3'}>
                  {listings.map((listing, idx) => (
                    <div key={listing.id}>
                      <ListingCard listing={listing} variant={view} />
                      {/* Inline ad after 5th listing */}
                      {idx === 4 && view === 'grid' && (
                        <div className="col-span-1" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Inline ad between pages */}
                <div className="flex justify-center my-4">
                  <AdZone slug="search-inline" labeled />
                </div>

                <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} />
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium text-base mb-1">Nuk u gjetën shpallje.</p>
                <p className="text-sm">Provo me fjalë kyçe të ndryshme ose hiq disa filtra.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
