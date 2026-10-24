'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Pagination from '@/components/ui/Pagination';
import Toast from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

interface Ad {
  id: string;
  title: string;
  advertiserName: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  priority: number;
  deletedAt?: string | null;
  _count?: { impressions: number; clicks: number };
  zone?: { id: string; name: string; slug: string };
}

type AdStatus = 'active' | 'scheduled' | 'expired' | 'paused';

function getAdStatus(ad: Ad): AdStatus {
  const now = new Date();
  if (!ad.isActive) return 'paused';
  if (new Date(ad.endsAt) < now) return 'expired';
  if (new Date(ad.startsAt) > now) return 'scheduled';
  return 'active';
}

function ctr(clicks: number, impressions: number) {
  if (!impressions) return '0.00';
  return ((clicks / impressions) * 100).toFixed(2);
}

const STATUS_TABS: { value: AdStatus | ''; label: string }[] = [
  { value: '',          label: 'Të Gjitha'   },
  { value: 'active',    label: 'Aktive'      },
  { value: 'scheduled', label: 'Planifikuara'},
  { value: 'expired',   label: 'Skaduara'    },
  { value: 'paused',    label: 'Pauzuara'    },
];

const STATUS_BADGE: Record<AdStatus, string> = {
  active:    'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  expired:   'bg-gray-100 text-gray-500',
  paused:    'bg-amber-100 text-amber-700',
};
const STATUS_LABEL: Record<AdStatus, string> = {
  active: 'Aktive', scheduled: 'Planifikuar', expired: 'Skaduar', paused: 'Pauzuar',
};



function AdsContent() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const statusFilter = (sp.get('status') ?? '') as AdStatus | '';
  const zoneFilter = sp.get('zone') ?? '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const search = sp.get('search') ?? '';
  const [zones, setZones] = useState<{id: string; name: string}[]>([]);
  const [pages, setPages] = useState(1);

  const [ads,     setAds]     = useState<Ad[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [delModal, setDelModal] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true); setLoadError('');
    const params = new URLSearchParams({ limit: '20', page: String(page) });
    if (statusFilter) params.set('status', statusFilter);
    if (zoneFilter) params.set('zoneId', zoneFilter);
    if (search) params.set('search', search);
    adminFetch<{ data: Ad[]; meta: { total: number; totalPages: number } }>(`/admin/ads?${params}`, token)
      .then(r => { if (!active) return;
      if (!Array.isArray(r.data) || !r.meta || !Number.isFinite(r.meta.total) || !Number.isFinite(r.meta.totalPages)) throw new Error("Lista nuk u ngarkua plotësisht. Provoni përsëri.");
      setAds(r.data); setTotal(r.meta.total); setPages(r.meta.totalPages); if (page > Math.max(1,r.meta.totalPages)) { const p = new URLSearchParams(sp.toString()); p.set('page', String(Math.max(1,r.meta.totalPages))); router.replace(`${pathname}?${p}`); } }).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, statusFilter, zoneFilter, search, page, revision]);

  async function togglePause(ad: Ad) {
 return runAction(async () => {

    if (!token) return;
    const endpoint = ad.isActive ? `/admin/ads/${ad.id}/pause` : `/admin/ads/${ad.id}/resume`;
    await adminFetch(endpoint, token, { method: 'POST' });
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, isActive: !ad.isActive } : a));
    setRevision(n => n + 1); showToast(ad.isActive ? 'Kampanja u pauzua' : 'Kampanja u rifillua');

 });
}

  async function duplicate(id: string) {
 return runAction(async () => {

    if (!token) return;
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth() + 1);
    try {
      const newAd = await adminFetch<Ad>(`/admin/ads/${id}/duplicate`, token, {
        method: 'POST',
        body: JSON.stringify({ startsAt: now.toISOString(), endsAt: end.toISOString() }),
      });
      setAds(prev => [newAd, ...prev]);
      showToast('Kampanja u duplikua'); setRevision(n => n + 1);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjatë duplikimit', 'error');
    }

 });
}

  async function softDelete(id: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/ads/${id}`, token, { method: 'DELETE' });
    setAds(prev => prev.filter(a => a.id !== id));
    setDelModal(null);
    showToast('Kampanja u fshi'); setRevision(n => n + 1);

 });
}

  useEffect(() => { if (token) adminFetch<{id: string; name: string}[]>('/admin/ad-zones', token).then(setZones).catch(() => setLoadError('Zonat nuk u ngarkuan. Provoni përsëri.')); }, [token, revision]);
  const filtered = ads;

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-dark">Reklamat</h1>
          <p className="text-gray-400 text-xs mt-0.5">{total} gjithsej</p>
        </div>
        <Link href="/admin/reklamat/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Reklamë e Re
        </Link>
      </div>

      <ValidatedForm onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); const p = new URLSearchParams(sp.toString()); p.set('search', String(form.get('search') ?? '').trim()); p.delete('page'); router.push(`${pathname}?${p}`); }} className="flex gap-2">
        <input key={search} name="search" defaultValue={search} aria-label="Kërko titull ose reklamues" placeholder="Kërko titull ose reklamues" className="border rounded p-2 flex-1 min-w-0" /><button className="bg-primary text-white px-4 rounded">Kërko</button>
      </ValidatedForm>
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap border-b border-gray-200">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(t => {
            const params = new URLSearchParams(sp.toString());
            params.delete('page');
            if (t.value) params.set('status', t.value); else params.delete('status');
            if (zoneFilter) params.set('zone', zoneFilter);
            return (
              <button key={t.value} aria-pressed={statusFilter === t.value}
                onClick={() => router.push(params.size ? `${pathname}?${params}` : pathname)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === t.value ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Zone filter */}
        {zones.length > 1 && (
          <select aria-label="Filtro sipas zonës"
            value={zoneFilter}
            onChange={e => {
              const params = new URLSearchParams(sp.toString());
            params.delete('page');
              if (statusFilter) params.set('status', statusFilter);
              if (e.currentTarget.value) params.set('zone', e.currentTarget.value); else params.delete('zone');
              router.push(params.size ? `${pathname}?${params}` : pathname);
            }}
            className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-primary bg-white"
          >
            <option value="">Të gjitha zonat</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">📢</p>
            <p className="text-sm text-gray-500 font-medium">Nuk ka reklama.</p>
            <Link href="/admin/reklamat/new" className="inline-block mt-3 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark">
              + Reklamë e Re
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]" data-responsive="cards">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Titulli / Reklamuesi</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Zona</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Statusi</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Datat</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden md:table-cell">Prioriteti</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Imp / Klik / CTR</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(ad => {
                  const adStatus = getAdStatus(ad);
                  const impressions = ad._count?.impressions ?? 0;
                  const clicks      = ad._count?.clicks ?? 0;
                  return (
                    <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3" data-label="Titulli / Reklamuesi">
                        <p className="font-semibold text-dark text-xs">{ad.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{ad.advertiserName}</p>
                      </td>
                      <td className="px-3 py-3" data-label="Zona">
                        {ad.zone && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {ad.zone.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3" data-label="Statusi">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[adStatus]}`}>
                          {STATUS_LABEL[adStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-400" data-label="Datat">
                        {new Date(ad.startsAt).toLocaleDateString('sq-AL')} → {new Date(ad.endsAt).toLocaleDateString('sq-AL')}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell" data-label="Prioriteti">
                        <span className="text-xs font-semibold text-gray-600">{ad.priority}</span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500" data-label="Imp / Klik / CTR">
                        {impressions.toLocaleString()} / {clicks.toLocaleString()} / <span className="font-semibold text-primary">{ctr(clicks, impressions)}%</span>
                      </td>
                      <td className="px-4 py-3" data-label="Veprime">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/reklamat/${ad.id}`} className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors" title="Edito">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button onClick={() => togglePause(ad)} className={`p-1 rounded transition-colors ${ad.isActive ? 'text-amber-800 hover:bg-amber-50' : 'text-green-700 hover:bg-green-50'}`} title={ad.isActive ? 'Pauzo' : 'Rifillo'} aria-pressed={ad.isActive}>
                            {ad.isActive ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </button>
                          <button onClick={() => duplicate(ad.id)} className="p-1 rounded text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition-colors" title="Duplikо">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => setDelModal(ad.id)} className="p-1 rounded text-red-700 hover:bg-red-50 transition-colors" title="Fshi">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <Pagination page={page} totalPages={pages} total={total} />
      {delModal && (
        <Modal label="Fshi Kampanjën" onClose={() => setDelModal(null)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <span className="text-3xl">🗑️</span>
            <h3 className="text-sm font-bold text-dark mt-2 mb-1">Fshi Kampanjën</h3>
            <p className="text-xs text-gray-500 mb-4">Të dhënat e impresioneve dhe klikimeve do të ruhen.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelModal(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={() => softDelete(delModal)} className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">Fshi</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse bg-white rounded-xl" />}>
      <AdsContent />
    </Suspense>
  );
}
