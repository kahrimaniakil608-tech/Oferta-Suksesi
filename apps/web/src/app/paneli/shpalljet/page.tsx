'use client';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import { authFetch } from '@/lib/session';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { statusLabel } from '@/lib/labels';
import { timeAgo, imgSrc } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface Listing {
  id: string; slug: string; title: string; status: string;
  viewsCount: number; contactClicks: number;
  createdAt: string; expiresAt: string;
  rejectionReason?: string | null;
  isFeatured: boolean; isUrgent: boolean;
  category?: { name: string };
  city?: { name: string };
  images: Array<{ thumbUrl: string }>;
}

const TABS = [
  { value: '',               label: 'Të gjitha' },
  { value: 'PUBLISHED',      label: 'Aktive' },
  { value: 'PENDING_REVIEW', label: 'Në Pritje' },
  { value: 'EXPIRED',        label: 'Skaduar' },
  { value: 'REJECTED',       label: 'Refuzuar' },
  { value: 'DRAFT',          label: 'Draft' },
  { value: 'ARCHIVED',       label: 'Koshi' },
];

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED:      'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED:       'bg-red-100 text-red-700',
  EXPIRED:        'bg-orange-100 text-orange-800',
  DRAFT:          'bg-gray-100 text-gray-500',
  ARCHIVED:       'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Aktive', PENDING_REVIEW: 'Në Pritje',
  REJECTED: 'Refuzuar', EXPIRED: 'Skaduar', DRAFT: 'Draft', ARCHIVED: 'Arkivuar',
};

export default function MyListings() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [status,   setStatus]   = useState('');
  const [savedStatus, setSavedStatus] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('saved') === '1') setSavedStatus(params.get('status') ?? 'SAVED');
  }, []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [counts,   setCounts]   = useState<Record<string, number>>({});
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const [loading,  setLoading]  = useState(true);

  const fetchCounts = useCallback(() => {
    if (!token) return;
    authFetch(`${API}/users/me/listings/counts`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('Shpalljet nuk u ngarkuan.'); return r.json(); })
      .then((r: any) => {
        setCounts(r.counts ?? {});
      })
      .catch(() => setError('Shpalljet nuk u ngarkuan. Provoni përsëri.'));
  }, [token]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    authFetch(`${API}/users/me/listings?${params}`, {
      credentials: 'include',
    })
      .then(r => { if (!r.ok) throw new Error('Shpalljet nuk u ngarkuan.'); return r.json(); })
      .then((r: any) => {
        setListings(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []);
        setTotal(r.meta?.total ?? (Array.isArray(r.data) ? r.data.length : 0));
        setPages(r.meta?.totalPages ?? 1);
      })
      .catch(() => setError('Shpalljet nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, status, page, revision]);

  async function deleteListing(id: string) {
 return runAction(async () => {

    if (!token || !window.confirm('Jeni i sigurt? Shpallja do të arkivohet.')) return;
    try {
    const res = await authFetch(`${API}/listings/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Ndryshimi dështoi. Provoni përsëri.');
    setListings(prev => prev.filter(l => l.id !== id));
    setTotal(t => t - 1);
    fetchCounts();
    } catch (error) { setError(error instanceof Error ? error.message : "Nuk mund të lidhem me serverin."); }

 });
}

  async function restoreListing(id: string) {
 return runAction(async () => {

    if (!token) return;
    try {
    const res = await authFetch(`${API}/listings/${id}/restore`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Ndryshimi dështoi. Provoni përsëri.');
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'DRAFT' } : l));
      if (status === 'ARCHIVED') {
        setListings(prev => prev.filter(l => l.id !== id));
        setTotal(t => t - 1);
      }
      fetchCounts();
    }
    } catch (error) { setError(error instanceof Error ? error.message : "Nuk mund të lidhem me serverin."); }

 });
}

  async function permanentDeleteListing(id: string) {
 return runAction(async () => {

    if (!token || !window.confirm('Jeni i sigurt? Ky veprim nuk mund të kthehet.')) return;
    try {
    const res = await authFetch(`${API}/listings/${id}/permanent`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Ndryshimi dështoi. Provoni përsëri.');
    if (res.ok) {
      setListings(prev => prev.filter(l => l.id !== id));
      setTotal(t => t - 1);
      fetchCounts();
    }
    } catch (error) { setError(error instanceof Error ? error.message : "Nuk mund të lidhem me serverin."); }

 });
}

  async function renewListing(id: string) {
 return runAction(async () => {

    if (!token || !confirm('Rinovimi ndryshon afatin dhe mund ta dërgojë shpalljen përsëri në shqyrtim. Të vazhdohet?')) return;
    try {
    const res = await authFetch(`${API}/listings/${id}/renew`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Ndryshimi dështoi. Provoni përsëri.');
    if (res.ok) {
      const updated = await res.json() as { expiresAt: string; status: string };
      setListings(prev => prev.map(l => l.id === id ? { ...l, expiresAt: updated.expiresAt, status: updated.status } : l));
      setSavedStatus(updated.status); fetchCounts(); retry(n => n+1);
    }
    } catch (error) { setError(error instanceof Error ? error.message : "Nuk mund të lidhem me serverin."); }

 });
}

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {error && <p role="alert">{error} <button onClick={() => { retry(n => n+1); fetchCounts(); }}>Provo përsëri</button></p>}
      {savedStatus && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
        {savedStatus === 'PENDING_REVIEW' ? 'Shpallja u ruajt dhe është dërguar për shqyrtim. Do të shfaqet publikisht pas miratimit.' : 'Shpallja u ruajt. Mund ta menaxhoni më poshtë.'}
      </p>}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-dark">Shpalljet e Mia <span className="text-gray-400 font-normal text-sm">({total})</span></h1>
        <Link
          href="/posto-shpallje"
          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          + E Re
        </Link>
      </div>

      {/* Status tabs with counts */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => {
          const count = t.value === '' ? totalCount : (counts[t.value] ?? 0);
          if (t.value !== '' && count === 0 && t.value !== 'ARCHIVED') return null;
          return (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                status === t.value
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
             aria-pressed={status === t.value}>
              {t.value === 'ARCHIVED' && <span className="text-xs">🗑</span>}
              {t.label}
              {count > 0 && (
                <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none ${
                  status === t.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {status === 'ARCHIVED' ? (
              <p>Koshi është bosh.</p>
            ) : (
              <>
                <p className="mb-3">Nuk ka shpallje.</p>
                <Link href="/posto-shpallje" className="text-primary text-sm font-semibold hover:underline">
                  Posto shpalljen tuaj të parë →
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {listings.map((l) => {
                const days = daysLeft(l.expiresAt);
                return (
                  <div key={l.id} className={`px-3 sm:px-4 py-3 ${l.status === 'ARCHIVED' ? 'bg-gray-50' : ''}`}>
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      {l.images[0] ? (
                        <img
                          src={imgSrc(l.images[0].thumbUrl)}
                          alt={l.title}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-lg">
                          📷
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-semibold text-dark truncate flex-1">{l.title}</p>
                          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100'}`}>
                            {STATUS_LABEL[l.status] ?? l.status}
                          </span>
                        </div>
                        {l.status === 'REJECTED' && <p className="text-red-800 text-xs mt-2">{l.rejectionReason || 'Shpallja kërkon korrigjim. Kontaktoni mbështetjen nëse arsyeja nuk shfaqet.'} <Link className="underline" href={`/posto-shpallje?edit=${l.id}`}>Korrigjo dhe ridërgo</Link></p>}
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {l.category?.name} · {l.city?.name} · {timeAgo(l.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-500">👁 {l.viewsCount}</span>
                          <span className="text-xs text-gray-500">📞 {l.contactClicks}</span>
                          {l.status === 'PUBLISHED' && (
                            <span className={`text-xs ${days <= 3 ? 'text-red-700 font-semibold' : 'text-gray-400'}`}>
                              ⏱ {days}d mbetur
                            </span>
                          )}
                          {l.isFeatured && <span className="text-xs text-accent font-semibold">⭐ E veçuar</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-2 ml-0 sm:ml-[calc(3.5rem+0.75rem)]">
                      {l.status === 'ARCHIVED' ? (
                        <>
                          <button
                            onClick={() => restoreListing(l.id)}
                            className="px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors"
                          >
                            Rikthe
                          </button>
                          <button
                            onClick={() => permanentDeleteListing(l.id)}
                            className="px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-md hover:bg-red-100 transition-colors"
                          >
                            Fshi Përgjithmonë
                          </button>
                        </>
                      ) : (
                        <>
                          {l.status === 'PUBLISHED' && <Link
                            href={`/shpalljet/${l.slug}`}
                            className="px-2.5 py-1.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-md hover:bg-gray-50 transition-colors text-center"
                          >
                            Shiko
                          </Link>}
                          {['PUBLISHED', 'DRAFT', 'PENDING_REVIEW', 'REJECTED', 'EXPIRED'].includes(l.status) && (
                            <Link
                              href={`/posto-shpallje?edit=${l.id}`}
                              className="px-2.5 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-md hover:bg-primary/20 transition-colors text-center"
                            >
                              Edito
                            </Link>
                          )}
                          {l.status === 'PUBLISHED' && (
                            <button
                              onClick={() => renewListing(l.id)}
                              className="px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors"
                              title="Rinovo afatin; mund të kërkohet shqyrtim"
                            >
                              Rinovo
                            </button>
                          )}
                          {(l.status === 'EXPIRED') && (
                            <button
                              onClick={() => renewListing(l.id)}
                              className="px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors"
                            >
                              Rinovo
                            </button>
                          )}
                          <button
                            onClick={() => deleteListing(l.id)}
                            className="px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-md hover:bg-red-100 transition-colors ml-auto"
                          >
                            Fshij
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Faqja {page} nga {pages}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    ← Prapa
                  </button>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Para →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </ActionRegion>;
}
