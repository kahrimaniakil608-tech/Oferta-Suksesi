"use client";
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useState, useRef, useCallback, useEffect, useId } from "react";
import Modal from "@/components/ui/Modal";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { imgSrc } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

export interface FilterValues {
  city: string;
  price_min: string;
  price_max: string;
  has_photos: boolean;
  isFeatured: boolean;
  sort: string;
  subcategory: string;
}

interface FilterPanelProps {
  initialFilters: FilterValues;
  subcategories?: Subcategory[];
  categorySlug?: string;
  sidebarExtra?: React.ReactNode;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Më të rejat" },
  { value: "oldest", label: "Më të vjetrat" },
  { value: "price_asc", label: "Çmimi i ulët" },
  { value: "price_desc", label: "Çmimi i lartë" },
  { value: "views", label: "Më të shikuarat" },
];

interface SearchHit {
  id: string;
  slug: string;
  title: string;
  categoryName?: string;
  cityName?: string;
  price?: number;
  thumbUrl?: string;
}

export default function FilterPanel({
  initialFilters,
  subcategories,
  categorySlug,
  sidebarExtra,
}: FilterPanelProps) {
  const pathname = usePathname();
  const paramsInUrl = useSearchParams();
  const fixedCity = pathname.startsWith("/qytete/")
    ? pathname.split("/")[2]
    : "";
  const [cities, setCities] = useState<{ slug: string; name: string }[]>([]);
  const [citiesError, setCitiesError] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesRevision, retryCities] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCitiesLoading(true);
    setCitiesError(false);
    fetch(`${API}/cities`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((rows) => {
        if (!Array.isArray(rows)) throw new Error();
        if (!controller.signal.aborted) setCities(rows);
      })
      .catch(() => { if (!controller.signal.aborted) setCitiesError(true); })
      .finally(() => { if (!controller.signal.aborted) setCitiesLoading(false); });
    return () => controller.abort();
  }, [citiesRevision]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigating = useRef(false);
  const queryInUrl = paramsInUrl.toString();
  useEffect(() => { setIsSheetOpen(false); }, [pathname, queryInUrl]);
  useEffect(() => {
    // A history restore can revive the pre-navigation loading state from bfcache.
    const restored = () => { navigating.current = false; setIsNavigating(false); setIsSheetOpen(false); };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  function navigateFilters(url: string) {
    if (navigating.current) return;
    if (url === `${pathname}?${queryInUrl}`) {
      setIsSheetOpen(false);
      return;
    }
    // Filters drive server-rendered collections. Commit the document URL and
    // its results together, retaining ordinary reload/Back semantics.
    navigating.current = true;
    setIsNavigating(true);
    window.location.assign(url);
  }

  const [filterError, setFilterError] = useState("");
  const [city, setCity] = useState(initialFilters.city);
  const [priceMin, setPriceMin] = useState(initialFilters.price_min);
  const [priceMax, setPriceMax] = useState(initialFilters.price_max);
  const [hasPhotos, setHasPhotos] = useState(initialFilters.has_photos);
  const [featured, setFeatured] = useState(initialFilters.isFeatured);
  const [sort, setSort] = useState(initialFilters.sort || "newest");
  const [subcategory, setSubcategory] = useState(
    initialFilters.subcategory ?? "",
  );

  useEffect(() => {
    setCity(fixedCity || initialFilters.city);
    setPriceMin(initialFilters.price_min);
    setPriceMax(initialFilters.price_max);
    setHasPhotos(initialFilters.has_photos);
    setFeatured(initialFilters.isFeatured);
    setSort(initialFilters.sort || "newest");
    setSubcategory(initialFilters.subcategory ?? "");
  }, [
    fixedCity,
    initialFilters.city,
    initialFilters.price_min,
    initialFilters.price_max,
    initialFilters.has_photos,
    initialFilters.isFeatured,
    initialFilters.sort,
    initialFilters.subcategory,
  ]);

  // Sidebar search state
  const [searchQ, setSearchQ] = useState(paramsInUrl.get('q') ?? '');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedHit, setSelectedHit] = useState(-1);
  const suggestionId = useId();
  const desktopSearch = useRef<HTMLDivElement>(null);
  const mobileSearch = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const request = useRef<AbortController | null>(null);
  const closeSearch = useCallback(() => {
    request.current?.abort();
    clearTimeout(searchDebounce.current);
    searchDebounce.current = undefined;
    setSearchOpen(false);
    setSearchLoading(false);
    setSelectedHit(-1);
    setSearchHits([]);
  }, []);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!desktopSearch.current?.contains(event.target as Node) && !mobileSearch.current?.contains(event.target as Node)) closeSearch();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [closeSearch]);
  useEffect(closeSearch, [city, priceMin, priceMax, hasPhotos, featured, sort, subcategory, categorySlug, isSheetOpen, closeSearch]);

  // Rebuild the editable filters, so clearing a field also removes its URL value.
  const filterQuery = new URLSearchParams(paramsInUrl.toString());
  ['page', 'q', 'city', 'price_min', 'price_max', 'has_photos', 'isFeatured', 'sort', 'subcategory'].forEach(key => filterQuery.delete(key));
  if (categorySlug) filterQuery.set('category', categorySlug);
  if (fixedCity || city) filterQuery.set('city', fixedCity || city);
  if (priceMin) filterQuery.set('price_min', priceMin);
  if (priceMax) filterQuery.set('price_max', priceMax);
  if (hasPhotos) filterQuery.set('has_photos', 'true');
  if (featured) filterQuery.set('isFeatured', 'true');
  if (sort) filterQuery.set('sort', sort);
  if (subcategory) filterQuery.set('subcategory', subcategory);
  const searchScope = filterQuery.toString();
  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(searchDebounce.current);
    },
    [],
  );
  const fetchSearchHits = useCallback(async (q: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (q.length < 2) {
      setSearchHits([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${API}/listings?${searchScope}&q=${encodeURIComponent(q)}&limit=5`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.data)) throw new Error();
      const results = (data.data ?? []).map((hit: any) => ({
        id: hit.id,
        slug: hit.slug ?? hit.id,
        title: hit.title,
        categoryName: hit.category?.name,
        cityName: hit.city?.name,
        price: hit.attributes?.price,
        thumbUrl: hit.images?.[0]?.thumbUrl,
      }));
      setSearchHits(results);
      setSearchOpen(results.length > 0);
    } catch {
      if (controller.signal.aborted) return;
      setSearchHits([]);
      setSearchOpen(false);
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }, [searchScope]);

  function handleSearchInput(val: string) {
    closeSearch();
    setSearchQ(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { searchDebounce.current = undefined; fetchSearchHits(val.trim()); }, 250);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      if (!validPrices()) return;
      const params = new URLSearchParams(searchScope);
      params.set('q', searchQ.trim());
      navigateFilters(searchOpen && selectedHit >= 0 && searchHits[selectedHit] ? `/shpalljet/${searchHits[selectedHit].slug}` : `/kerko?${params}`);
      closeSearch();
    }
  }

  function validPrices() {
    if ((priceMin && (!Number.isFinite(Number(priceMin)) || Number(priceMin) < 0)) || (priceMax && (!Number.isFinite(Number(priceMax)) || Number(priceMax) < 0)) || (priceMin && priceMax && Number(priceMin) > Number(priceMax))) {
      setFilterError('Çmimi minimal duhet të jetë zero ose më shumë dhe jo më i madh se çmimi maksimal.'); return false;
    }
    setFilterError(''); return true;
  }
  function applyFilters(overrideSubcategory?: string) {
    if (!validPrices()) return;
    const params = new URLSearchParams(paramsInUrl.toString());
    [
      "page",
      "subcategory",
      "city",
      "price_min",
      "price_max",
      "has_photos",
      "isFeatured",
      "sort",
    ].forEach((key) => params.delete(key));
    const sc =
      overrideSubcategory !== undefined ? overrideSubcategory : subcategory;
    if (sc) params.set("subcategory", sc);
    if (city) params.set("city", city);
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);
    if (hasPhotos) params.set("has_photos", "true");
    if (featured) params.set("isFeatured", "true");
    if (sort && sort !== "newest") params.set("sort", sort);
    navigateFilters(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setCity("");
    setPriceMin("");
    setPriceMax("");
    setHasPhotos(false);
    setFeatured(false);
    setSort("newest");
    setSubcategory("");
    const params = new URLSearchParams(paramsInUrl.toString());
    [
      "page",
      "subcategory",
      "city",
      "price_min",
      "price_max",
      "has_photos",
      "isFeatured",
      "sort",
    ].forEach((key) => params.delete(key));
    navigateFilters(`${pathname}?${params}`);
  }

  function handleSubcategoryClick(slug: string) {
    const newVal = subcategory === slug ? "" : slug;
    setSubcategory(newVal);
    applyFilters(newVal);
  }

  const hasActiveFilters =
    (!fixedCity && city) ||
    priceMin ||
    priceMax ||
    hasPhotos ||
    featured ||
    subcategory ||
    (sort && sort !== "newest");

  const sidebarSearch = (mobile = false) => (
    <div ref={mobile ? mobileSearch : desktopSearch} className="relative mb-5 pb-5 border-b border-gray-100"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeSearch(); }}>
      <ValidatedForm onSubmit={handleSearchSubmit}>
        <div className="relative">
          <SearchBarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            aria-label="Kërko brenda filtrave" type="search"
            role="combobox" aria-autocomplete="list" aria-expanded={searchOpen}
            aria-controls={`${suggestionId}-${mobile}`} aria-busy={searchLoading}
            aria-activedescendant={searchOpen && selectedHit >= 0 ? `${suggestionId}-${mobile}-${selectedHit}` : undefined}
            value={searchQ}
            onChange={(e) => handleSearchInput(e.currentTarget.value)}
            onFocus={() => {
              if (searchHits.length > 0) setSearchOpen(true);
            }}
            onKeyDown={event => {
              if (event.key === 'Escape' && (searchOpen || searchLoading || searchDebounce.current)) {
                event.preventDefault(); event.stopPropagation(); closeSearch(); searchDebounce.current = undefined;
              } else if (searchOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                setSelectedHit(previous => event.key === 'ArrowUp' && previous < 0 ? searchHits.length - 1 : (previous + (event.key === 'ArrowDown' ? 1 : searchHits.length - 1)) % searchHits.length);
              }
            }}
            placeholder="Kërko në shpallje..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
            autoComplete="off"
          />
          {searchLoading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </ValidatedForm>
      {searchOpen && searchHits.length > 0 && (
        <div className="absolute left-0 right-0 top-full -mt-4 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
          <div id={`${suggestionId}-${mobile}`} role="listbox" aria-label="Sugjerime brenda filtrave">
          {searchHits.map((hit, index) => (
            <Link
              key={hit.id}
              id={`${suggestionId}-${mobile}-${index}`} role="option" tabIndex={-1} aria-selected={selectedHit === index}
              href={`/shpalljet/${hit.slug}`}
              onClick={() => setSearchOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedHit === index ? 'bg-accent/5' : ''}`}
            >
              {hit.thumbUrl ? (
                <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={imgSrc(hit.thumbUrl)}
                    alt=""
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-md bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-xs">
                  📷
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">
                  {hit.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {hit.cityName}
                </p>
              </div>
              {hit.price != null && (
                <span className="text-xs font-bold text-accent shrink-0">
                  {Number(hit.price).toLocaleString("de-DE")} €
                </span>
              )}
            </Link>
          ))}
          </div>
          <button type="button"
            onClick={event => { setSelectedHit(-1); if (validPrices()) { const params = new URLSearchParams(searchScope); params.set('q', searchQ.trim()); navigateFilters(`/kerko?${params}`); } event.preventDefault(); }}
            className="block px-3 py-2 text-center text-xs font-semibold text-accent bg-gray-50 hover:bg-gray-100 border-t border-gray-100"
          >
            Shiko të gjitha →
          </button>
        </div>
      )}
    </div>
  );

  const filterForm = (
    <fieldset disabled={isNavigating} aria-busy={isNavigating} className="min-w-0 border-0 p-0 space-y-5">
      {isNavigating && <p role="status" className="text-sm text-primary">Duke ngarkuar rezultatet…</p>}
      {filterError && <p role="alert" className="text-red-800 text-sm">{filterError}</p>}
      {/* Subcategories */}
      {subcategories && subcategories.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nën-kategoritë
          </label>
          <div className="flex flex-wrap gap-1.5">
            {subcategories.map((sc) => (
              <button
                key={sc.id} aria-pressed={subcategory === sc.slug}
                onClick={() => handleSubcategoryClick(sc.slug)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  subcategory === sc.slug
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {sc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Renditja
        </label>
        <select
          aria-label="Renditja" value={sort}
          onChange={(e) => setSort(e.currentTarget.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Qyteti
        </label>
        <select
          value={fixedCity || city}
          disabled={!!fixedCity || citiesLoading || citiesError}
          aria-label="Qyteti"
          onChange={(e) => setCity(e.currentTarget.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
        >
          <option value="">{citiesLoading ? 'Duke ngarkuar…' : citiesError ? 'Qytetet nuk u ngarkuan' : 'Të gjitha'}</option>
          {(fixedCity || city) && !cities.some(c => c.slug === (fixedCity || city)) && <option value={fixedCity || city}>{fixedCity || city}</option>}
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {citiesError && <p role="alert" className="mt-2 text-sm text-red-800">Qytetet nuk u ngarkuan. <button type="button" onClick={() => retryCities(n => n + 1)} className="underline min-h-10">Provo përsëri</button></p>}
      </div>

      {/* Price range */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Çmimi (€)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            aria-label="Çmimi minimal" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyFilters(); } }}
            aria-invalid={!!filterError} value={priceMin}
            onChange={(e) => setPriceMin(e.currentTarget.value)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <input
            type="number"
            placeholder="Max"
            aria-label="Çmimi maksimal" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyFilters(); } }}
            aria-invalid={!!filterError} value={priceMax}
            onChange={(e) => setPriceMax(e.currentTarget.value)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <Toggle label="Me foto" checked={hasPhotos} onChange={setHasPhotos} />
        <Toggle
          label="Vetëm të zgjedhurat"
          checked={featured}
          onChange={setFeatured}
        />
      </div>

      {/* Buttons */}
      <button type="button"
        onClick={() => applyFilters()}
        className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-semibold transition-colors"
      >
        Apliko Filtrat
      </button>
      {hasActiveFilters && (
        <button type="button"
          onClick={clearFilters}
          className="w-full py-2 text-sm text-gray-500 hover:text-dark transition-colors"
        >
          Pastro filtrat
        </button>
      )}
    </fieldset>
  );

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-28 xl:top-20">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-dark text-sm">Filtra</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-accent underline hover:no-underline"
              >
                Pastro
              </button>
            )}
          </div>
          {sidebarSearch()}
          {filterForm}
        </div>
        {sidebarExtra}
      </aside>

      {/* ── Mobile: floating button ────────────────────────────────────────── */}
      <button
        onClick={() => setIsSheetOpen(true)}
        className="md:hidden fixed bottom-[calc(80px+env(safe-area-inset-bottom)+var(--mobile-ad-height,0px))] right-4 z-40 flex items-center gap-2 bg-accent text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg text-sm font-semibold"
        aria-label="Hap filtrat"
      >
        <FilterIcon className="w-4 h-4" />
        Filtra
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-accent absolute -top-0.5 -right-0.5" />
        )}
      </button>

      {/* ── Mobile: bottom sheet ───────────────────────────────────────────── */}
      {isSheetOpen && (
        <Modal
          label="Filtra"
          onClose={() => setIsSheetOpen(false)}
          className="md:hidden w-full"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-dark">Filtra</h2>
              <button
                onClick={() => setIsSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Mbyll"
              >
                <XIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {sidebarSearch(true)}
            {filterForm}
          </div>
        </Modal>
      )}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-dark">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4h18M7 12h10M11 20h2"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SearchBarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
