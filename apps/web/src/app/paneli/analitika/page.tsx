'use client';
import { statusLabel } from '@/lib/labels';
import { authFetch } from '@/lib/session';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { imgSrc } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ListingStats {
  id: string; slug: string; title: string; viewsCount: number;
  contactClicks: number; status: string; createdAt: string;
  isFeatured: boolean;
  images: Array<{ thumbUrl: string }>;
}

interface AnalyticsData {
  totalViews: number;
  totalContacts: number;
  totalListings: number;
  listings: ListingStats[];
}

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED:      'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED:       'bg-red-100 text-red-700',
  EXPIRED:        'bg-orange-100 text-orange-800',
  DRAFT:          'bg-gray-100 text-gray-500',
};

export default function Analytics() {
  const { token } = useAuth();
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError('');
    authFetch(`${API}/users/me/analytics`, {
      credentials: 'include',
    })
      .then(r => { if (!r.ok) throw new Error('Analitika nuk u ngarkua.'); return r.json() as Promise<AnalyticsData>; })
      .then(setData)
      .catch(error => setError(error.message))
      .finally(() => setLoading(false));
  }, [token, revision]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
        <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />
      </div>
    );
  }

  if (error) return <p role="alert">{error} <button onClick={() => retry(n => n+1)}>Provo përsëri</button></p>;
  const maxViews = Math.max(...(data?.listings.map(l => l.viewsCount) ?? [1]), 1);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-dark">Analitika</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Shikime Gjithsej', value: data?.totalViews ?? 0, color: 'text-primary' },
          { label: 'Klikime në kontakt',          value: data?.totalContacts ?? 0, color: 'text-accent' },
          { label: 'Shpallje Aktive',   value: data?.listings.filter(l => l.status === 'PUBLISHED').length ?? 0, color: 'text-blue-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Listings performance table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-dark text-sm">Performanca e Shpalljeve</h2>
          <p className="text-xs text-gray-400 mt-0.5">Rendosur sipas shikimeve</p>
        </div>

        {!data?.listings.length ? (
          <div className="p-10 text-center text-gray-400">
            Nuk ka shpallje ende.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.listings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                {/* Thumbnail */}
                {l.images[0] ? (
                  <img src={imgSrc(l.images[0].thumbUrl)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                )}

                {/* Title + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-dark truncate flex-1">{l.title}</p>
                    <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100'}`}>
                      {l.status === 'PUBLISHED' ? 'Aktive' : statusLabel(l.status)}
                    </span>
                  </div>
                  {/* View bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(l.viewsCount / maxViews) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{l.viewsCount} 👁</span>
                    <span className="text-xs text-gray-400 shrink-0">{l.contactClicks} 📞</span>
                  </div>
                </div>

                <Link
                  href={l.status === 'PUBLISHED' ? `/shpalljet/${l.slug}` : `/posto-shpallje?edit=${l.id}`}
                  className="shrink-0 text-xs font-bold text-primary hover:underline"
                >
                  Shiko
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Këto shifra përmbledhin aktivitetin e regjistruar gjatë gjithë jetës së shpalljeve. Klikimet në kontakt nuk tregojnë biseda ose shitje të përfunduara.
      </p>
    </div>
  );
}
