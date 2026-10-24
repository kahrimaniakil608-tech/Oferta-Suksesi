'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import FilterPanel from '@/components/filters/FilterPanel';
import ListingCard from '@/components/listings/ListingCard';
import Pagination from '@/components/ui/Pagination';
import type { Listing } from '@/lib/api';
import { withCategoryIcon } from '@/lib/category-icons';



const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

function SearchContent() {
  const sp       = useSearchParams();
  const router   = useRouter();
  const pathname = usePathname();

  const q          = sp.get('q') ?? '';
  const catSlug    = sp.get('category') ?? '';
  const subSlug    = sp.get('subcategory') ?? '';
  const citySlug   = sp.get('city') ?? '';
  const priceMin = sp.get('price_min') ?? '';
  const priceMax = sp.get('price_max') ?? '';
  const hasPhotos = sp.get('has_photos') === 'true';
  const featured = sp.get('isFeatured') === 'true';
  const sort = sp.get('sort') ?? 'newest';
  const requestedPage = Number(sp.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [query,        setQuery]        = useState(q);
  const [category,     setCategory]     = useState(catSlug);
  const [subcategory,  setSubcategory]  = useState(subSlug);
  const [city,         setCity]         = useState(citySlug);
  const [listings,     setListings]     = useState<Listing[]>([]);
  const [total,        setTotal]        = useState(0);
  const [pages,        setPages]        = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [categories, setCategories] = useState<(Subcategory & { icon?: string; children?: Subcategory[] })[]>([]);
  const [cities, setCities] = useState<Subcategory[]>([]);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setQuery(q); setCategory(catSlug); setSubcategory(subSlug); setCity(citySlug); }, [q, catSlug, subSlug, citySlug]);
  const hasFilters = q || catSlug || citySlug || subSlug || priceMin || priceMax || hasPhotos || featured || sort !== 'newest';

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError('');
    Promise.all(['categories','cities'].map(path => fetch(`${API}/${path}`, { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (!Array.isArray(data)) throw new Error(); return data; })))
      .then(([cats, towns]) => { if (!controller.signal.aborted) { setCategories(cats.map(withCategoryIcon)); setCities(towns); } }).catch(() => { if (!controller.signal.aborted) setCatalogError('Filtrat nuk u ngarkuan. Provoni përsëri.'); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => setSubcategories(categories.find(c => c.slug === catSlug)?.children ?? []), [categories, catSlug]);

  useEffect(() => {
    if (!hasFilters) { setListings([]); setTotal(0); setPages(1); setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), limit: '20', status: 'PUBLISHED' });
    if (q)        params.set('q', q);
    if (catSlug)  params.set('category', catSlug);
    if (subSlug)  params.set('subcategory', subSlug);
    if (citySlug) params.set('city', citySlug);
    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (hasPhotos) params.set('has_photos', 'true');
    if (featured) params.set('isFeatured', 'true');
    params.set('sort', sort);
    fetch(`${API}/listings?${params}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (!Array.isArray(data.data) || !Number.isFinite(data.meta?.total) || !Number.isFinite(data.meta?.totalPages)) throw new Error(); return data as { data: Listing[]; meta: { total: number; totalPages: number } }; })
      .then(r => {
        if (controller.signal.aborted) return;
        setListings(r.data);
        setTotal(r.meta.total);
        setPages(r.meta.totalPages);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Kërkimi dështoi. Provoni përsëri për rezultate të përditësuara.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [q, catSlug, subSlug, citySlug, page, priceMin, priceMax, hasPhotos, featured, sort, hasFilters, retry]);

  function applyFilters(overrides?: { q?: string; category?: string; subcategory?: string; city?: string }) {
    const params = new URLSearchParams(sp.toString());
    ['q','category','subcategory','city','page'].forEach(key => params.delete(key));
    const newQ    = overrides?.q ?? query;
    const newCat  = overrides?.category ?? category;
    const newSub  = overrides?.subcategory !== undefined ? overrides.subcategory : subcategory;
    const newCity = overrides?.city ?? city;
    if (newQ.trim())    params.set('q', newQ.trim());
    if (newCat)         params.set('category', newCat);
    if (newSub)         params.set('subcategory', newSub);
    if (newCity)        params.set('city', newCity);
    router.push(`${pathname}?${params}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applyFilters({ q: query });
  }

  function handleCategoryChange(val: string) {
    setCategory(val);
    setSubcategory('');
    applyFilters({ category: val, subcategory: '' });
  }

  function handleSubcategoryClick(slug: string) {
    const newVal = subcategory === slug ? '' : slug;
    setSubcategory(newVal);
    applyFilters({ subcategory: newVal });
  }

  function handleCityChange(val: string) {
    setCity(val);
    applyFilters({ city: val });
  }

  function clearFilters() {
    setQuery('');
    setCategory('');
    setSubcategory('');
    setCity('');
    router.push(pathname);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search & Filters */}
      <div className="bg-white border-b border-gray-200 relative z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold tracking-tight mb-4">Kërko shpallje</h1>
          <ValidatedForm role="search" aria-label="Kërkimi i shpalljeve" onSubmit={handleSearch} className="grid grid-cols-2 sm:grid-cols-[minmax(160px,1fr)_160px_150px_auto] items-center gap-3">
            {/* Search input */}
            <div className="col-span-2 sm:col-span-1 min-w-0">
              <input
                aria-label="Kërko shpallje" type="search"
                value={query}
                onChange={e => setQuery(e.currentTarget.value)}
                placeholder="Kërko shpallje..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
              />
            </div>

            {/* Category select */}
            <select
              aria-label="Kategoria" value={category}
              onChange={e => handleCategoryChange(e.currentTarget.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition w-full min-w-0"
            >
              <option value="">Të gjitha kategoritë</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            {/* City select */}
            <select
              aria-label="Qyteti" value={city}
              onChange={e => handleCityChange(e.currentTarget.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition w-full min-w-0"
            >
              <option value="">Të gjitha qytetet</option>
              {cities.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Search button */}
            <button
              type="submit"
              className="col-span-2 sm:col-span-1 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors"
            >
              Kërko
            </button>

            {/* Clear filters */}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="col-span-2 sm:col-span-4 justify-self-start text-sm text-gray-500 hover:text-red-700 transition-colors py-2"
              >
                Pastro filtrat ✕
              </button>
            )}
          </ValidatedForm>

          {/* Subcategory chips */}
          {subcategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {subcategories.map((sc) => (
                <button
                  key={sc.id}
                  aria-pressed={subcategory === sc.slug}
                  onClick={() => handleSubcategoryClick(sc.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    subcategory === sc.slug
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {catalogError && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{catalogError} <button className="underline" onClick={() => setRetry(n => n+1)}>Provo përsëri</button></p>}
        {error && <p role="alert" className="bg-red-50 p-4 rounded-xl text-red-700">{error} <button className="underline" onClick={() => setRetry(n => n+1)}>Provo përsëri</button></p>}
        {/* Results header */}
        {hasFilters && !error && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p role="status" className="text-sm text-gray-500">
              {loading ? 'Duke kërkuar…' : `${total} rezultate`}
              {q && !loading && <> për "<strong>{q}</strong>"</>}
            </p>
            {catSlug && !loading && (
              <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
                {categories.find(c => c.slug === catSlug)?.icon}{' '}
                {categories.find(c => c.slug === catSlug)?.name}
              </span>
            )}
            {subSlug && !loading && (
              <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
                {subcategories.find(sc => sc.slug === subSlug)?.name}
              </span>
            )}
            {citySlug && !loading && (
              <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
                📍 {cities.find(c => c.slug === citySlug)?.name}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-5 items-start"><FilterPanel initialFilters={{ city: citySlug, subcategory: subSlug, price_min: priceMin, price_max: priceMax, has_photos: hasPhotos, isFeatured: featured, sort }} categorySlug={catSlug} subcategories={subcategories} />
        <div className="min-w-0 flex-1">
        {/* Empty state — no filters */}
        {!hasFilters && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-500 font-medium">Shkruani një fjalë kyçe ose zgjidhni filtrat</p>
            <p className="text-sm text-gray-400 mt-1">p.sh. &quot;veturë&quot;, &quot;banesa&quot;, &quot;punë&quot;</p>
            <Link href="/shpallje" className="inline-flex mt-4 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-primary hover:bg-white">Shfleto të gjitha shpalljet →</Link>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-4/3 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!error && !loading && hasFilters && listings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-gray-500 font-medium">Nuk u gjet asgjë me këta filtra</p>
            <p className="text-sm text-gray-400 mt-1">Provoni fjalë të tjera ose ndërroni kategorinë / qytetin</p>
            <button onClick={clearFilters} className="mt-4 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-primary hover:bg-white">Pastro filtrat dhe provo përsëri</button>
          </div>
        )}

        {/* Results grid */}
        {!error && !loading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
            </div>

            <Pagination page={page} totalPages={pages} total={total} />
          </>
        )}
        </div></div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SearchContent />
    </Suspense>
  );
}
