'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import Toast from '@/components/ui/Feedback';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { timeAgo } from '@/lib/utils';
import { statusLabel } from '@/lib/labels';

const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

interface Listing {
  id: string;
  slug: string;
  title: string;
  status: string;
  isFeatured: boolean;
  isUrgent: boolean;
  viewsCount: number;
  deletedAt?: string | null;
  createdAt: string;
  images?: { url: string }[];
  category?: { id: string; name: string };
  city?: { id: string; name: string };
  user?: { id: string; name: string };
}

interface StatusCounts {
  ALL?: number;
  DRAFT?: number;
  PENDING_REVIEW?: number;
  PUBLISHED?: number;
  EXPIRED?: number;
  REJECTED?: number;
  ARCHIVED?: number;
  DELETED?: number;
}

const TABS = [
  { value: '',               label: 'Të Gjitha',   color: 'text-gray-600'   },
  { value: 'PENDING_REVIEW', label: 'Në Pritje',   color: 'text-amber-800'  },
  { value: 'PUBLISHED',      label: 'Aktive',       color: 'text-green-700'  },
  { value: 'REJECTED', label: 'Refuzuar', color: 'text-red-700' },
  { value: 'ARCHIVED', label: 'Arkivuara', color: 'text-gray-600' },
  { value: 'DRAFT',          label: 'Draft',        color: 'text-blue-700'   },
  { value: 'EXPIRED',        label: 'Skaduara',     color: 'text-orange-800' },
  { value: 'DELETED',        label: 'Të Fshira',    color: 'text-gray-400'   },
];

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED:      'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED:       'bg-red-100 text-red-700',
  ARCHIVED:       'bg-gray-200 text-gray-600',
  EXPIRED:        'bg-orange-100 text-orange-800',
  DRAFT:          'bg-blue-100 text-blue-700',
};
function ListingsContent() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [catalog, setCatalog] = useState<{categories: {id:number;name:string;slug:string;icon?:string}[];cities:{id:number;name:string;slug:string}[]}>({categories:[],cities:[]});
  const [catalogError, setCatalogError] = useState('');
  const [dateError, setDateError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const status   = sp.get('status') ?? '';
  const requestedPage = Number(sp.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search   = sp.get('search') ?? '';
  const catId    = sp.get('categoryId') ?? '';
  const cityId   = sp.get('cityId') ?? '';
  const datePreset = sp.get('datePreset') ?? '';
  const dateFrom = sp.get('dateFrom') ?? '';
  const dateTo   = sp.get('dateTo') ?? '';
  const featured = sp.get('featured') ?? '';

  const [listings,     setListings]     = useState<Listing[]>([]);
  const [total,        setTotal]        = useState(0);
  const [pages,        setPages]        = useState(1);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [searchInput,  setSearchInput]  = useState(search);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customFrom,   setCustomFrom]   = useState(dateFrom);
  const [customTo,     setCustomTo]     = useState(dateTo);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });

  };

  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => { setCustomFrom(dateFrom); setCustomTo(dateTo); setDateError(''); }, [dateFrom, dateTo]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setCatalogError('');
    Promise.all(['/admin/categories','/admin/cities'].map(path => adminFetch<{id:number;name:string;slug:string;icon?:string}[]>(path, token, {signal:controller.signal})))
      .then(([categories,cities]) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(categories) || !Array.isArray(cities)) throw new Error();
        setCatalog({categories,cities});
      }).catch(() => { if (!controller.signal.aborted) setCatalogError('Kategoritë dhe qytetet nuk u ngarkuan.'); });
    return () => controller.abort();
  }, [token, revision]);

  function validDates(from: string, to: string) {
    const valid = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
    return valid(from) && valid(to) && !(from && to && from > to);
  }


  useEffect(() => { setSelected(new Set()); }, [status, page, search, catId, cityId, datePreset, dateFrom, dateTo, featured]);

  // Compute effective dateFrom/dateTo from preset or custom
  function getDateRange(): { from?: string; to?: string } {
    const now = new Date();
    if (datePreset === 'today') return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
    if (datePreset === 'mtd') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    }
    if (datePreset === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    if (datePreset === 'ytd') {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
    }
    if (datePreset === 'last-7') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.toISOString() };
    }
    if (datePreset === 'last-30') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { from: d.toISOString() };
    }
    if (datePreset === 'custom') {
      return {
        from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      };
    }
    return {};
  }

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true); setLoadError('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status === 'DELETED') {
      params.set('isDeleted', 'true');
    } else if (status) {
      params.set('status', status);
    }
    if (search)  params.set('search', search);
    if (catId)   params.set('category', catId);
    if (cityId)  params.set('city', cityId);
    if (featured === 'true')  params.set('isFeatured', 'true');
    if (featured === 'false') params.set('isFeatured', 'false');
    if (datePreset === 'custom' && !validDates(dateFrom, dateTo)) {
      setLoadError('Periudha është e pavlefshme. Data e fillimit duhet të jetë para datës së përfundimit.');
      setLoading(false);
      return;
    }
    const range = getDateRange();
    if (range.from) params.set('dateFrom', range.from);
    if (range.to)   params.set('dateTo', range.to);
    adminFetch<{ data: Listing[]; meta: { total: number; totalPages: number; statusCounts?: StatusCounts } }>(
      `/admin/listings?${params}`, token,
    ).then((r) => {
      if (!active) return;
      if (!Array.isArray(r.data) || !r.meta || !Number.isFinite(r.meta.total) || !Number.isFinite(r.meta.totalPages)) throw new Error("Lista nuk u ngarkua plotësisht. Provoni përsëri.");
      setListings(r.data);
      setTotal(r.meta.total);
      setPages(r.meta.totalPages);
      if (page > Math.max(1, r.meta.totalPages)) navPage(Math.max(1, r.meta.totalPages));
      if (r.meta.statusCounts) setStatusCounts(r.meta.statusCounts);
    }).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.')).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, status, page, search, catId, cityId, datePreset, dateFrom, dateTo, featured, revision]); // eslint-disable-line react-hooks/exhaustive-deps

  function navWith(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function navPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navWith({ search: searchInput });
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function approve(id: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/listings/${id}/approve`, token, { method: 'POST' });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'PUBLISHED' } : l));
      setRevision(n => n + 1); showToast('Shpallja u aprovua');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}


  async function toggleFeature(id: string, current: boolean) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/listings/${id}/feature`, token, { method: 'POST' });
    setListings(prev => prev.map(l => l.id === id ? { ...l, isFeatured: !current } : l)); setRevision(n => n + 1);

 });
}

  async function softDelete(id: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/listings/${id}`, token, { method: 'DELETE' });
    setListings(prev => prev.filter(l => l.id !== id));
    setRevision(n => n + 1); showToast('Shpallja u fshi');

 });
}

  async function restore(id: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/listings/${id}/restore`, token, { method: 'POST' });
    setListings(prev => prev.filter(l => l.id !== id));
    setRevision(n => n + 1); showToast('Shpallja u restaurua');

 });
}

  async function permanentDelete(id: string) {
 return runAction(async () => {

    if (!token) return;
    if (!window.confirm('Jeni i sigurt? Ky veprim nuk mund të kthehet.')) return;
    try {
      await adminFetch(`/admin/listings/${id}/permanent`, token, { method: 'DELETE' });
      setListings(prev => prev.filter(l => l.id !== id));
      setTotal(t => t - 1);
      setRevision(n => n + 1); showToast('Shpallja u fshi përgjithmonë');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function bumpListing(id: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/listings/${id}/bump`, token, { method: 'POST' });
      setRevision(n => n + 1); showToast('Shpallja u rinovua');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function emptyTrash() {
 return runAction(async () => {

    if (!token) return;
    if (!window.confirm('Jeni i sigurt? Të gjitha shpalljet e fshira do të fshihen përgjithmonë. Ky veprim nuk mund të kthehet.')) return;
    try {
      const result = await adminFetch<{ count: number }>(`/admin/listings/trash`, token, { method: 'DELETE' });
      showToast(`${result.count} shpallje u fshin përgjithmonë`);
      setListings([]);
      setTotal(0); setRevision(n => n + 1);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  type BulkAction = 'approve' | 'reject' | 'delete' | 'feature' | 'renew';
  const [bulkIntent, setBulkIntent] = useState<BulkAction | null>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkFailures, setBulkFailures] = useState<{id: string; error?: string}[]>([]);
  const bulkLabels = { approve: 'Aprovo', reject: 'Refuzo', delete: 'Fshi', feature: 'Veço', renew: 'Rinovo' };
  function bulkAction(action: BulkAction) { setBulkIntent(action); setBulkReason(''); }
  async function confirmBulk() {
 return runAction(async () => {

    if (!token || !bulkIntent || !selected.size) return;
    const result = await adminFetch<{succeeded: number; failed: number; results: {id: string; success: boolean; error?: string}[]}>('/admin/listings/bulk', token, {
      method: 'POST', body: JSON.stringify({ listingIds: listings.filter(l => selected.has(l.id)).map(l => l.id), action: bulkIntent, reason: bulkReason || undefined }),
    });
    const failed = result.results.filter(r => !r.success);
    setBulkFailures(failed); setSelected(new Set(failed.map(r => r.id))); setBulkIntent(null);
    showToast(`${result.succeeded} u përfunduan; ${result.failed} dështuan.`, result.failed ? 'error' : 'success');
    setRevision(n => n + 1);

 });
}

  const tabCount = (v: string) => {
    if (v === '')        return statusCounts.ALL ?? total;
    if (v === 'DELETED') return statusCounts.DELETED ?? 0;
    return statusCounts[v as keyof StatusCounts] ?? 0;
  };

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}
      {bulkFailures.length > 0 && <ul className="text-sm text-red-800 list-disc pl-5">{bulkFailures.map(r => <li key={r.id}>{listings.find(l => l.id === r.id)?.title ?? r.id}: {r.error ?? 'Veprimi dështoi'}</li>)}</ul>}
      {bulkIntent && <Modal label="Konfirmo veprimin masiv" onClose={() => setBulkIntent(null)} className="w-[min(32rem,calc(100%-2rem))] p-5 bg-white rounded-xl">
        <h2 className="font-bold">{bulkLabels[bulkIntent]} {selected.size} shpallje</h2>
        <p className="my-3 text-sm">{bulkIntent === 'delete' ? 'Shpalljet hiqen nga publiku dhe kalojnë në të fshira.' : bulkIntent === 'reject' ? 'Shpalljet refuzohen. Shpjegoni çfarë duhet korrigjuar; autori mund të njoftohet.' : bulkIntent === 'approve' ? 'Shpalljet bëhen publike dhe autorët mund të njoftohen.' : bulkIntent === 'renew' ? 'Përditësohet data e publikimit dhe afati i skadimit.' : 'Shpalljet shënohen si të veçuara.'}</p>
        <ul className="max-h-40 overflow-auto text-sm list-disc pl-5">{listings.filter(l => selected.has(l.id)).map(l => <li key={l.id}>{l.title}</li>)}</ul>
        {(bulkIntent === 'reject' || bulkIntent === 'delete') && <Field><label>Arsyeja</label><textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} className="w-full border rounded p-2" required /></Field>}
        <div className="flex gap-3 mt-4"><button onClick={() => setBulkIntent(null)}>Anulo</button><button className="bg-primary text-white p-2 rounded" disabled={['reject','delete'].includes(bulkIntent) && !bulkReason.trim()} onClick={confirmBulk}>Konfirmo</button></div>
      </Modal>}


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-dark">Shpalljet</h1>
          <p className="text-gray-400 text-xs mt-0.5">{total} gjithsej</p>
        </div>
        {status === 'DELETED' && listings.length > 0 && (
          <button
            onClick={emptyTrash}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Zbraz Koshin
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-1">
        {TABS.map(t => (
          <button key={t.value}
            onClick={() => navWith({ status: t.value })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              status === t.value
                ? `bg-white border border-b-white border-gray-200 -mb-px ${t.color}`
                : 'text-gray-400 hover:text-gray-600'
            }`}
           aria-pressed={status === t.value}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${status === t.value ? 'bg-gray-100' : 'bg-gray-100'}`}>
              {tabCount(t.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <ValidatedForm onSubmit={handleSearch} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text" aria-label="Kërko titullin e shpalljes" placeholder="Kërko titull…" value={searchInput}
            onChange={e => setSearchInput(e.currentTarget.value)}
            className="text-xs text-gray-600 placeholder-gray-400 outline-none w-40 bg-transparent"
          />
        </ValidatedForm>
        <select aria-label="Kategoria" value={catId} onChange={e => navWith({ categoryId: e.currentTarget.value })}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary">
          <option value="">Të gjitha kategoritë</option>
          {catalog.categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <select aria-label="Qyteti" value={cityId} onChange={e => navWith({ cityId: e.currentTarget.value })}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary">
          <option value="">Të gjitha qytetet</option>
          {catalog.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Periudha" value={datePreset} onChange={e => {
          const v = e.currentTarget.value;
          if (v === 'custom') {
            navWith({ datePreset: v });
          } else {
            navWith({ datePreset: v, dateFrom: '', dateTo: '' });
          }
        }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary">
          <option value="">Të gjitha datat</option>
          <option value="today">Sot</option>
          <option value="mtd">Ky muaj</option>
          <option value="last-month">Muaji i kaluar</option>
          <option value="last-7">7 ditët e fundit</option>
          <option value="last-30">30 ditët e fundit</option>
          <option value="ytd">Ky vit</option>
          <option value="custom">Periudhë e caktuar</option>
        </select>
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Data e fillimit" type="date" value={customFrom} onChange={e => setCustomFrom(e.currentTarget.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none focus:border-primary" />
            <span className="text-xs text-gray-400">-</span>
            <input aria-label="Data e përfundimit" type="date" value={customTo} onChange={e => setCustomTo(e.currentTarget.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none focus:border-primary" />
            <button onClick={() => { if (!validDates(customFrom, customTo)) { setDateError('Data e fillimit duhet të jetë para datës së përfundimit.'); return; } setDateError(''); navWith({ dateFrom: customFrom, dateTo: customTo }); }}
              className="px-2.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors">
              Filtro
            </button>
          </div>
        )}
        <select aria-label="Shpallje të veçuara" value={featured} onChange={e => navWith({ featured: e.currentTarget.value })}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary">
          <option value="">E veçuar: Të gjitha</option>
          <option value="true">E veçuar</option>
          <option value="false">Jo E veçuar</option>
        </select>
      </div>

      {dateError && <p role="alert" className="text-sm text-red-700">{dateError}</p>}
      {catalogError && <p role="alert" className="text-sm text-red-700">{catalogError} <button className="underline" onClick={() => setRevision(n => n+1)}>Provo përsëri</button></p>}
      {(search || catId || cityId || datePreset || featured) && <Link href={status ? `/admin/shpalljet?status=${status}` : '/admin/shpalljet'} className="inline-flex py-2 text-sm font-semibold text-primary underline">Pastro filtrat</Link>}
      {/* Bulk actions */}
      {selected.size > 0 && !loading && !loadError && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-xs text-primary font-semibold">{selected.size} zgjedhur</span>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            <button onClick={() => bulkAction('approve')} className="px-2.5 py-1 bg-green-700 text-white text-xs font-bold rounded-md hover:bg-green-700">Aprovo</button>
            <button onClick={() => bulkAction('feature')} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md hover:bg-amber-100">E veçuar</button>
            <button onClick={() => bulkAction('renew')}   className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md hover:bg-blue-100">Rinovo</button>
            <button onClick={() => bulkAction('delete')}  className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md hover:bg-gray-200">Fshi</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loadError ? <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} /> : loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nuk ka shpallje.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]" data-responsive="cards">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th scope="col" aria-label="Përzgjedhja" className="px-4 py-3 w-8">
                      <input aria-label="Zgjidh të gjitha shpalljet e kësaj faqeje" type="checkbox"
                        checked={selected.size === listings.length && listings.length > 0}
                        onChange={() => setSelected(prev => prev.size === listings.length ? new Set() : new Set(listings.map(l => l.id)))}
                        className="rounded border-gray-300 text-primary focus:ring-primary/20" />
                    </th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Titulli</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden md:table-cell">Autori</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Kategoria / Qyteti</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Statusi</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Shikime</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map((l) => (
                    <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${selected.has(l.id) ? 'bg-primary/3' : ''}`}>
                      <td className="px-4 py-3" data-label="Përzgjedhja">
                        <input aria-label={`Zgjidh ${l.title}`} type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/20" />
                      </td>
                      <td className="px-3 py-3" data-label="Titulli">
                        <div className="flex items-center gap-2">
                          {l.images?.[0] ? (
                            <img src={`${IMAGE_BASE}/uploads/${l.images[0].url}`} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">🖼</div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-dark text-xs truncate max-w-[180px]">{l.title}</p>
                            <p className="text-xs text-gray-400">{timeAgo(l.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {l.isFeatured && <span className="text-xs font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">⭐ E veçuar</span>}
                          {l.isUrgent  && <span className="text-xs font-bold px-1 py-0.5 rounded bg-red-100 text-red-700">🔴 Urgjente</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-500" data-label="Autori">{l.user?.name}</td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500" data-label="Kategoria / Qyteti">{l.category?.name} · {l.city?.name}</td>
                      <td className="px-3 py-3" data-label="Statusi">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusLabel(l.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500" data-label="Shikime">{l.viewsCount}</td>
                      <td className="px-4 py-3" data-label="Veprime">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/shpalljet/${l.id}`}
                            className="p-1 rounded text-primary hover:bg-primary/10 transition-colors" title="Edito">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <Link href={`/shpalljet/${l.slug}`} target="_blank"
                            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Shiko">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                          {l.status === 'PENDING_REVIEW' && (
                            <>
                              <button onClick={() => approve(l.id)} className="p-1 rounded text-green-700 hover:bg-green-50 transition-colors" title="Aprovo">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </button>
                            </>
                          )}
                          <button onClick={() => bumpListing(l.id)} className="p-1 rounded text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition-colors" title="Rinovo">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                          <button aria-pressed={l.isFeatured} onClick={() => toggleFeature(l.id, l.isFeatured)} className={`p-1 rounded transition-colors ${l.isFeatured ? 'text-amber-800 hover:bg-amber-50' : 'text-gray-500 hover:text-amber-800 hover:bg-amber-50'}`} title="E veçuar">
                            <svg className="w-3.5 h-3.5" fill={l.isFeatured ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          </button>
                          {l.deletedAt ? (
                            <>
                              <button onClick={() => restore(l.id)} className="p-1 rounded text-green-700 hover:bg-green-50 transition-colors" title="Restauro">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              </button>
                              <button onClick={() => permanentDelete(l.id)} className="p-1 rounded text-red-700 hover:bg-red-50 transition-colors" title="Fshi Përgjithmonë">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6" strokeWidth={3} /></svg>
                              </button>
                            </>
                          ) : (
                            <button onClick={() => softDelete(l.id)} className="p-1 rounded text-red-700 hover:bg-red-50 transition-colors" title="Fshi">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Faqja {page} nga {pages} · {total} gjithsej</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => navPage(page - 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    ← Prapa
                  </button>
                  <button disabled={page >= pages} onClick={() => navPage(page + 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
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

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse bg-white rounded-xl" />}>
      <ListingsContent />
    </Suspense>
  );
}
