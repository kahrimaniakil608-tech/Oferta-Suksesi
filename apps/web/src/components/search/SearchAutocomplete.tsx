'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useId, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface SuggestionHit {
  id: string;
  slug: string;
  title: string;
  categoryName?: string;
  cityName?: string;
  price?: number;
  thumbUrl?: string;
}

export default function SearchAutocomplete() {
  const router = useRouter();
  const suggestionId = useId();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SuggestionHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); clearTimeout(debounceRef.current); }, []);
  const fetchSuggestions = useCallback(async (q: string) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    if (q.length < 2) { setHits([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/search/listings?q=${encodeURIComponent(q)}&limit=6`, { signal: controller.signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.data)) throw new Error();
      // Meilisearch returns hits in data.data array
      const results = (data.data ?? data.hits ?? []).map((hit: any) => ({
        id: hit.id,
        slug: hit.slug ?? hit.id,
        title: hit.title,
        categoryName: hit.categoryName ?? hit.category?.name,
        cityName: hit.cityName ?? hit.city?.name,
        price: hit.price ?? hit.attributes?.price,
        thumbUrl: hit.thumbUrl ?? hit.images?.[0]?.thumbUrl,
      }));
      setHits(results);
      setIsOpen(true);
    } catch {
      if (controller.signal.aborted) return;
      // Fallback to regular API search if Meilisearch isn't available
      try {
        const res = await fetch(`${API}/listings?q=${encodeURIComponent(q)}&limit=6`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (controller.signal.aborted) return;
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.data)) throw new Error();
        const mapped = (data.data ?? []).map((l: any) => ({
          id: l.id,
          slug: l.slug ?? l.id,
          title: l.title,
          categoryName: l.category?.name,
          cityName: l.city?.name,
          price: l.attributes?.price,
          thumbUrl: l.images?.[0]?.thumbUrl,
        }));
        setHits(mapped);
        setIsOpen(true);
      } catch {
        if (!controller.signal.aborted) setHits([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    request.current?.abort();
    setQuery(value);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIdx >= 0 && hits[selectedIdx]) {
      router.push(`/shpalljet/${hits[selectedIdx].slug}`);
    } else if (query.trim()) {
      router.push(`/kerko?q=${encodeURIComponent(query.trim())}`);
    }
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => (prev + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => (prev - 1 + hits.length) % hits.length);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <ValidatedForm onSubmit={handleSubmit} role="search" aria-label="Kërko shpallje">
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => handleInputChange(e.currentTarget.value)}
            onFocus={() => { if (hits.length > 0) setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Kërko shpallje, produkte, shërbime..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-dark placeholder-gray-400 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all shadow-sm"
            autoComplete="off"
            aria-label="Kërko"
            role="combobox" aria-autocomplete="list" aria-activedescendant={isOpen && selectedIdx >= 0 && hits[selectedIdx] ? `${suggestionId}-${selectedIdx}` : undefined} aria-expanded={isOpen && hits.length > 0}
            aria-controls={suggestionId}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </ValidatedForm>

      {/* Suggestions dropdown */}
      {isOpen && hits.length > 0 && (
        <div
          id={suggestionId}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          role="listbox"
        >
          {hits.map((hit, idx) => (
            <Link
              key={hit.id}
              href={`/shpalljet/${hit.slug}`}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                selectedIdx === idx ? 'bg-accent/5' : 'hover:bg-gray-50'
              }`}
              id={`${suggestionId}-${idx}`} tabIndex={-1} role="option"
              aria-selected={selectedIdx === idx}
            >
              {/* Thumbnail */}
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
                  {[hit.categoryName, hit.cityName].filter(Boolean).join(' · ')}
                </p>
              </div>

              {hit.price !== undefined && hit.price !== null && (
                <span className="text-sm font-bold text-accent shrink-0">
                  {Number(hit.price).toLocaleString('de-DE')} €
                </span>
              )}
            </Link>
          ))}

          {/* View all link */}
          {query.trim() && (
            <Link
              href={`/kerko?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-center text-sm font-semibold text-accent bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-100"
            >
              Shiko të gjitha rezultatet →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
