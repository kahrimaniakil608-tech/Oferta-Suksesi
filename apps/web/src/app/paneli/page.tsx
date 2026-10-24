'use client';
import { authFetch } from '@/lib/session';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo, imgSrc } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface Stats {
  totalViews: number;
  totalContacts: number;
  totalListings: number;
  listings: Array<{
    id: string; title: string; viewsCount: number;
    contactClicks: number; status: string; createdAt: string;
    isFeatured: boolean;
    images: Array<{ thumbUrl: string }>;
  }>;
}

interface ProfileData {
  _count: { listings: number; favourites: number };
  trustScore: number;
}

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED:      'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED:       'bg-red-100 text-red-700',
  EXPIRED:        'bg-orange-100 text-orange-800',
  DRAFT:          'bg-gray-100 text-gray-500',
  ARCHIVED:       'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED:      'Publikuar',
  PENDING_REVIEW: 'Në Pritje',
  REJECTED:       'Refuzuar',
  EXPIRED:        'Skaduar',
  DRAFT:          'Draft',
  ARCHIVED:       'Arkivuar',
};

export default function DashboardHome() {
  const { token, user } = useAuth();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError('');
    Promise.all([
      authFetch(`${API}/users/me/analytics`, { credentials: 'include' }).then(r => { if (!r.ok) throw new Error('Paneli nuk u ngarkua.'); return r.json() as Promise<Stats>; }),
      authFetch(`${API}/users/me`, { credentials: 'include' }).then(r => { if (!r.ok) throw new Error('Profili nuk u ngarkua.'); return r.json() as Promise<ProfileData>; }),
    ]).then(([s, p]) => {
      setStats(s);
      setProfile(p);
    }).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, [token, revision]);

  if (error) return <p role="alert">{error} <button onClick={() => retry(n => n+1)}>Provo përsëri</button></p>;
  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="bg-linear-to-br from-primary to-primary-light rounded-xl p-5 text-white">
        <p className="text-sm opacity-80">Mirë se vini,</p>
        <h1 className="text-xl font-black mt-0.5">{user?.name}</h1>
        <div className="flex items-center gap-1.5 mt-3">
          <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${profile?.trustScore ?? 0}%` }}
            />
          </div>
          <span className="text-xs opacity-80">Besueshmëria: {profile?.trustScore ?? 0}/100</span>
        </div>
      </div>

      {/* Admin welcome banner */}
      {user?.role === 'ADMIN' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">🛡️</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-800">Paneli i Administratorit</p>
              <p className="text-xs text-amber-800">Keni qasje të plotë. Menaxhoni platformën me kujdes.</p>
            </div>
          </div>
          <a
            href="/admin"
            className="sm:ml-auto shrink-0 px-3 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
          >
            Hap Admin →
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Shpallje',      value: profile?._count?.listings ?? 0,   href: '/paneli/shpalljet',      color: 'text-primary' },
          { label: 'Të Preferuara', value: profile?._count?.favourites ?? 0, href: '/paneli/te-preferuarat', color: 'text-accent' },
          { label: 'Shikime',       value: stats?.totalViews ?? 0,            href: '/paneli/analitika',      color: 'text-blue-700' },
        ].map(({ label, value, href, color }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>
              {loading ? <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" /> : value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/posto-shpallje"
          className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors"
        >
          + Shpallje e Re
        </Link>
        <Link
          href="/paneli/cilesimet"
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cilësimet e Profilit
        </Link>
      </div>

      {/* Recent listings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-dark text-sm">Shpalljet e Fundit</h2>
          <Link href="/paneli/shpalljet" className="text-xs text-primary hover:underline">
            Shiko të gjitha →
          </Link>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !stats?.listings?.length ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">Nuk keni shpallje ende.</p>
            <Link href="/posto-shpallje" className="text-primary text-sm font-semibold hover:underline">
              Posto shpalljen tuaj të parë →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(stats?.listings ?? []).slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                {l.images[0] ? (
                  <img
                    src={imgSrc(l.images[0].thumbUrl)}
                    alt={l.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{l.title}</p>
                  <p className="text-xs text-gray-400">{timeAgo(l.createdAt)} · {l.viewsCount} shikime</p>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100'}`}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
