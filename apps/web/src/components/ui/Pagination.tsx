'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

function PaginationInner({ page, totalPages, total }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `${pathname}?${params.toString()}`;
  }

  // Build page list with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 py-6"
      aria-label="Navigimi i faqeve"
    >
      <Link
        href={pageUrl(Math.max(1, page - 1))}
        aria-label="Faqja e mëparshme"
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={`flex min-h-11 items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          page <= 1
            ? 'text-gray-300 pointer-events-none'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prapa</span>
      </Link>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 py-2 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            aria-label={`Faqja ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-8 sm:min-w-11 min-h-11 px-1 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-accent text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={pageUrl(Math.min(totalPages, page + 1))}
        aria-label="Faqja tjetër"
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={`flex min-h-11 items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          page >= totalPages
            ? 'text-gray-300 pointer-events-none'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <span className="hidden sm:inline">Tjetër</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
      <p className="basis-full mt-2 text-center text-xs text-gray-500">Faqja {page} nga {totalPages} · {total.toLocaleString('de-DE')} rezultate</p>
    </nav>
  );
}

export default function Pagination(props: PaginationProps) {
  return (
    <Suspense fallback={null}>
      <PaginationInner {...props} />
    </Suspense>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
