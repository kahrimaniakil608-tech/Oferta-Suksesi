'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminEditButton({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  if (!user || user.role !== 'ADMIN') return null;

  return (
    <Link
      href={`/admin/shpalljet/${listingId}`}
      className="ml-auto inline-flex items-center gap-1.5 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-dark transition-colors shadow-sm"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Ndrysho shpalljen
    </Link>
  );
}
