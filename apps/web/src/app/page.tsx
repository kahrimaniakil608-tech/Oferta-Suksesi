import { serverApiFetch } from '@/lib/server-fetch';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import SearchBar from '@/components/search/SearchBar';
import CategoryCard from '@/components/categories/CategoryCard';
import ListingCard from '@/components/listings/ListingCard';
import FeaturedCarousel from '@/components/listings/FeaturedCarousel';
import ViewToggle from '@/components/listings/ViewToggle';
import type { ViewMode } from '@/components/listings/ViewToggle';
import AdZone from '@/components/ads/AdZone';
import { getListings, getCategories } from '@/lib/api';
import { imgSrc } from '@/lib/utils';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface City { name: string; slug: string }

interface CompanySpotlight {
  id: string; name: string; slug: string;
  logoUrl?: string | null; isVerified: boolean; isPremium: boolean;
  city?: { name: string } | null;
  _count: { listings: number };
}

async function getPremiumCompanies(): Promise<CompanySpotlight[]> {
  try {
    const res = await serverApiFetch(`${API}/companies?premium=true&limit=12`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

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

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const view: ViewMode = sp.view === 'list' ? 'list' : 'grid';
  const [{ data: listings }, { data: featuredListings }, companies, cities, categories] = await Promise.all([
    getListings({ limit: 18, sort: 'newest', isFeatured: false }),
    getListings({ limit: 10, isFeatured: true }),
    getPremiumCompanies(),
    getCities(),
    getCategories(),
  ]);

  return (
    <>
      {/* 1 ── Hero / Search ─────────────────────────────────────────────────── */}
      <section
        className="bg-linear-to-br from-primary-dark to-primary-light text-white py-9 sm:py-14 px-4"
        aria-label="Kërko shpallje"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight text-white">
            Gjej gjithçka në Kosovë
          </h1>
          <p className="text-green-100 mb-6 text-base md:text-lg">
            Shpallje për shtëpinë, punën dhe gjithçka që të duhet.
          </p>
          <div className="flex justify-center">
            <SearchBar cities={cities} />
          </div>
          <p className="mt-5 text-sm text-green-100">Ke diçka për të ofruar? <Link href="/posto-shpallje" className="font-semibold text-white underline underline-offset-4">Posto një shpallje</Link></p>
        </div>
      </section>

      {/* 7 ── Shfleto Kategoritë ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-7" aria-labelledby="categories-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 id="categories-heading" className="text-xl font-bold text-dark">
          Shfleto Kategoritë
        </h2>
        <Link href="/kategorite" className="text-sm font-semibold text-accent hover:underline">Të gjitha kategoritë →</Link>
        </div>
        <div tabIndex={0} role="group" aria-label="Kategoritë e shpalljeve" className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(140px,1fr)] gap-3 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-rows-none sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} />
          ))}
        </div>
      </section>

      {/* 2 ── Ad ────────────────────────────────────────────────────────────── */}
      <AdZone slug="homepage-leaderboard" className="max-w-7xl mx-auto px-4 py-4" />

      {/* 3 ── Featured Listings (carousel, 10 items, 5 visible) ─────────── */}
      {featuredListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6" aria-labelledby="featured-heading">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
            <h2 id="featured-heading" className="text-xl font-bold text-dark">
              Shpallje të Zgjedhura
            </h2>
            <a href="/shpallje?isFeatured=true" className="text-sm text-accent font-semibold hover:underline">
              Shiko të gjitha →
            </a>
          </div>
          <FeaturedCarousel>
            {featuredListings.map(listing => <div key={listing.id} className="snap-start"><ListingCard listing={listing} /></div>)}
          </FeaturedCarousel>
        </section>
      )}

      {/* 4 ── Ad ────────────────────────────────────────────────────────────── */}
      <AdZone slug="homepage-mid" className="max-w-7xl mx-auto px-4 py-4" />

      {/* 5 ── Kompani të përzgjedhura ─────────────────────────────────────────────── */}
      {companies.length > 0 && (
        <section
          className="bg-white border-t border-gray-100 py-8 px-4"
          aria-labelledby="companies-heading"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
              <h2 id="companies-heading" className="text-xl font-bold text-dark">
                Kompani të përzgjedhura
              </h2>
              <Link href="/kompanite" className="text-sm text-accent font-semibold hover:underline">
                Shiko të gjitha →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/kompanite/${c.slug}`}
                  className="shrink-0 w-32 md:w-auto flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                  title={c.name}
                >
                  <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden flex items-center justify-center">
                    {c.logoUrl ? (
                      <Image
                        src={imgSrc(c.logoUrl)}
                        alt={c.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl font-black text-accent">{c.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-dark text-center line-clamp-2 group-hover:text-accent transition-colors">
                    {c.name}
                  </span>
                  {c.isVerified && (
                    <span className="text-xs text-blue-700 font-semibold">✓ Verifikuar</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6 ── Ad ────────────────────────────────────────────────────────────── */}
      <AdZone slug="company-spotlight" className="max-w-7xl mx-auto px-4 py-4" />

      {/* 8 ── Ad ────────────────────────────────────────────────────────────── */}
      <AdZone slug="homepage-footer" className="max-w-7xl mx-auto px-4 py-4" />

      {/* 9 ── Shpalljet e Fundit ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-6" aria-labelledby="listings-heading">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
          <h2 id="listings-heading" className="text-xl font-bold text-dark">
            Shpalljet e Fundit
          </h2>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <ViewToggle current={view} />
            </Suspense>
            <a href="/shpallje" className="text-sm text-accent font-semibold hover:underline">
              Shiko të gjitha →
            </a>
          </div>
        </div>

        {listings.length > 0 ? (
          <>
            <div className={view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant={view} />
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link
                href="/shpallje"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors text-sm"
              >
                Shiko të gjitha shpalljet →
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">Nuk ka shpallje për momentin.</p>
            <a
              href="/posto-shpallje"
              className="inline-block mt-3 text-sm text-accent font-semibold hover:underline"
            >
              Posto shpalljen e parë →
            </a>
          </div>
        )}
      </section>
    </>
  );
}
