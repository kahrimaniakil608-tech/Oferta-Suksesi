'use client';

import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Illustration */}
      <div className="relative mb-8 w-36 h-36">
        <div className="absolute inset-0 rounded-full bg-accent/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-black text-accent select-none">404</span>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent/50 animate-bounce" />
        <div className="absolute -bottom-1 -left-2 w-2.5 h-2.5 rounded-full bg-primary-light/40 animate-bounce [animation-delay:0.3s]" />
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-2">
        Faqja nuk u gjet
      </h1>

      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        Kjo faqe nuk ekziston ose mund të jetë zhvendosur. Kthehu në dashboard ose zgjidh një opsion tjetër.
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Përmbledhja
        </Link>

        <Link
          href="/admin/shpalljet"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-accent text-sm font-semibold rounded-lg border border-accent/20 hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Shpalljet
        </Link>

        <Link
          href="/admin/perdoruesit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 text-sm font-semibold rounded-lg border border-gray-200 hover:border-accent/30 hover:text-accent transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          </svg>
          Përdoruesit
        </Link>

        <Link
          href="/admin/moderimi"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 text-sm font-semibold rounded-lg border border-gray-200 hover:border-accent/30 hover:text-accent transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Moderimi
        </Link>
      </div>

      {/* Home link */}
      <Link href="/" className="text-xs text-gray-400 hover:text-accent transition-colors">
        Kthehu në faqen kryesore &rarr;
      </Link>
    </div>
  );
}
