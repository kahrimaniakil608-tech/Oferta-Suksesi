"use client";
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useId, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCatalog } from "@/contexts/CatalogContext";
import { imgSrc } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

interface CityOption {
  name: string;
  slug: string;
}

interface SuggestionHit {
  id: string;
  slug: string;
  title: string;
  categoryName?: string;
  cityName?: string;
  price?: number;
  thumbUrl?: string;
}

interface SearchBarProps {
  initialQ?: string;
  initialCategory?: string;
  initialCity?: string;
  cities?: CityOption[];
}

export default function SearchBar({
  initialQ = "",
  initialCategory = "",
  initialCity = "",
  cities,
}: SearchBarProps) {
  const router = useRouter();
  const suggestionId = useId();
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState(initialCity);

  // Autocomplete state
  const [hits, setHits] = useState<SuggestionHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const {
    categories,
    cities: catalogCities,
    error: catalogError,
  } = useCatalog();
  const cityList = cities ?? catalogCities;
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(debounceRef.current);
    },
    [],
  );
  useEffect(() => {
    setQ(initialQ);
    setCategory(initialCategory);
    setCity(initialCity);
  }, [initialQ, initialCategory, initialCity]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        request.current?.abort();
        clearTimeout(debounceRef.current);
        setIsOpen(false);
        setSelectedIdx(-1);
        setLoading(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (query.length < 2) {
      setHits([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // The index filters by display names; the collection API accepts the
      // catalogue slugs used by these controls and the full-results page.
      const res = await fetch(
        `${API}/${category || city ? 'listings' : 'search/listings'}?${new URLSearchParams({ q: query, limit: '5', ...(category ? { category } : {}), ...(city ? { city } : {}) })}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const results = (data.data ?? data.hits ?? []).map((hit: any) => ({
        id: hit.id,
        slug: hit.slug ?? hit.id,
        title: hit.title,
        categoryName: hit.categoryName ?? hit.category?.name,
        cityName: hit.cityName ?? hit.city?.name,
        price: hit.price ?? hit.attributes?.price,
        thumbUrl: hit.thumbUrl ?? hit.images?.[0]?.thumbUrl,
      }));
      if (controller.signal.aborted) return;
      setHits(results);
      setIsOpen(results.length > 0);
    } catch {
      if (controller.signal.aborted) return;
      if (category || city) { setHits([]); setIsOpen(false); return; }
      // Fallback to regular API
      try {
        const res = await fetch(
          `${API}/listings?${new URLSearchParams({ q: query, limit: '5', ...(category ? { category } : {}), ...(city ? { city } : {}) })}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const mapped = (data.data ?? []).map((l: any) => ({
          id: l.id,
          slug: l.slug ?? l.id,
          title: l.title,
          categoryName: l.category?.name,
          cityName: l.city?.name,
          price: l.attributes?.price,
          thumbUrl: l.images?.[0]?.thumbUrl,
        }));
        if (controller.signal.aborted) return;
        setHits(mapped);
        setIsOpen(mapped.length > 0);
      } catch {
        if (controller.signal.aborted) return;
        setHits([]);
        setIsOpen(false);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [category, city]);

  useEffect(() => {
    request.current?.abort();
    clearTimeout(debounceRef.current);
    setHits([]);
    setSelectedIdx(-1);
    setIsOpen(false);
    setLoading(false);
  }, [category, city]);

  function closeSuggestions() {
    request.current?.abort();
    clearTimeout(debounceRef.current);
    setIsOpen(false);
    setSelectedIdx(-1);
    setLoading(false);
  }

  const searchUrl = `/kerko?${new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(category ? { category } : {}), ...(city ? { city } : {}) })}`;

  function handleInputChange(value: string) {
    request.current?.abort();
    setQ(value);
    setHits([]);
    setIsOpen(false);
    setLoading(false);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOpen && selectedIdx >= 0 && hits[selectedIdx]) {
      router.push(`/shpalljet/${hits[selectedIdx].slug}`);
    } else {
      router.push(searchUrl);
    }
    closeSuggestions();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSuggestions();
      return;
    }
    if (!isOpen || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + hits.length) % hits.length);
    }
  }

  return (
    <ValidatedForm
      onSubmit={handleSubmit}
      className="grid grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_160px_auto] gap-3 w-full max-w-4xl text-left"
      role="search"
      aria-label="Kërko shpallje"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeSuggestions(); }}
    >
      {/* Keyword input with autocomplete */}
      <div ref={wrapperRef} className="relative col-span-2 lg:col-span-1 min-w-0"
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeSuggestions(); }}>
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <input
          type="search"
          placeholder="Kërko shpallje, produkte, shërbime..."
          value={q}
          onChange={(e) => handleInputChange(e.currentTarget.value)}
          onFocus={() => {
            if (hits.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-dark placeholder-gray-400 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 border-0"
          aria-label="Fjalë kyçe"
          aria-busy={loading}
          autoComplete="off"
          role="combobox" aria-autocomplete="list" aria-activedescendant={isOpen && selectedIdx >= 0 && hits[selectedIdx] ? `${suggestionId}-${selectedIdx}` : undefined} aria-expanded={isOpen && hits.length > 0}
          aria-controls={suggestionId}
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Suggestions dropdown */}
        {isOpen && hits.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            <div id={suggestionId} role="listbox" aria-label="Sugjerime shpalljesh">
            {hits.map((hit, idx) => (
              <Link
                key={hit.id}
                href={`/shpalljet/${hit.slug}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  selectedIdx === idx ? "bg-accent/5" : "hover:bg-gray-50"
                }`}
                id={`${suggestionId}-${idx}`} tabIndex={-1} role="option"
                aria-selected={selectedIdx === idx}
              >
                {hit.thumbUrl ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <Image
                      src={imgSrc(hit.thumbUrl)}
                      alt=""
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-sm">
                    📷
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark truncate">{hit.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[hit.categoryName, hit.cityName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {hit.price != null && (
                  <span className="text-sm font-bold text-accent shrink-0">
                    {Number(hit.price).toLocaleString("de-DE")} €
                  </span>
                )}
              </Link>
            ))}
            </div>

            <Link
              href={searchUrl}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-center text-sm font-semibold text-accent bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-100"
            >
              Shiko të gjitha rezultatet →
            </Link>
          </div>
        )}
      </div>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => setCategory(e.currentTarget.value)}
        className="w-full min-w-0 px-3 py-3 rounded-xl bg-white text-dark text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 border-0 cursor-pointer"
        aria-label="Kategoria"
      >
        <option value="">
          {catalogError ? "Kategoritë nuk u ngarkuan" : "Të gjitha kategoritë"}
        </option>
        {categories.map((cat) => (
          <option key={cat.slug} value={cat.slug}>
            {cat.icon} {cat.name}
          </option>
        ))}
      </select>

      {/* City */}
      <select
        value={city}
        onChange={(e) => setCity(e.currentTarget.value)}
        className="w-full min-w-0 px-3 py-3 rounded-xl bg-white text-dark text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 border-0 cursor-pointer"
        aria-label="Qyteti"
      >
        <option value="">Të gjitha qytetet</option>
        {cityList.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="col-span-2 lg:col-span-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
      >
        <SearchIcon className="w-4 h-4" />
        Kërko
      </button>
    </ValidatedForm>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
