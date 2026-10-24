'use client';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { uploadImages } from '@/lib/image-upload';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { imgSrc } from '@/lib/utils';
import { campaignInstant, localDateTime, validCampaignDates } from '@/lib/campaign-dates';


interface AdDetail {
  id: string;
  title: string;
  advertiserName: string;
  adType: string;
  imageUrl?: string;
  embedCode?: string;
  targetUrl: string;
  isActive: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
  targetCategories?: { categoryId: number }[];
  targetCities?: { cityId: number }[];
  deletedAt?: string | null;
  zone?: { id: string; name: string; slug: string; width: number; height: number };
  _count?: { impressions: number; clicks: number };
}

interface Analytics {
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  uniqueViewers: number;
  dailyStats: { day: string; impressions: number; clicks: number }[];
  hourlyToday: { hour: number; impressions: number; clicks: number }[];
  topPages: { pageUrl: string; count: number }[];
}

const AD_TYPES = [
  { value: 'IMAGE_BANNER',      label: 'Banner (Imazh)'  },
];



function BarChart({ data, maxValue }: { data: { label: string; value: number; value2?: number }[]; maxValue: number }) {
  if (!data.length) return <p className="text-center text-gray-400 text-xs py-6">Nuk ka të dhëna.</p>;
  return (
    <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 min-w-[24px] flex-1">
          <div className="w-full flex items-end gap-0.5" style={{ height: 80 }}>
            {d.value2 !== undefined && (
              <div className="w-full rounded-t-sm bg-blue-700 transition-all"
                style={{ height: maxValue ? `${(d.value2 / maxValue) * 100}%` : 0 }} />
            )}
            <div className="w-full rounded-t-sm bg-primary/70 transition-all"
              style={{ height: maxValue ? `${(d.value / maxValue) * 100}%` : 0 }} />
          </div>
          <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdDetailPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const params    = useParams();
  const router    = useRouter();
  const id        = params.id as string;

  const [ad,        setAd]        = useState<AdDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [delModal,  setDelModal]  = useState(false);

  // Edit fields
  const [title,          setTitle]          = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [adType,         setAdType]         = useState('IMAGE_BANNER');
  const [imageUrl,       setImageUrl]       = useState('');
  const [embedCode,      setEmbedCode]      = useState('');
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imagePreview,   setImagePreview]   = useState('');
  const [uploading,      setUploading]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUrl,      setTargetUrl]      = useState('');
  const [startsAt,       setStartsAt]       = useState('');
  const [endsAt,         setEndsAt]         = useState('');
  const [priority,       setPriority]       = useState(50);
  const [categoryIds,    setCategoryIds]    = useState<number[]>([]);
  const [cityIds,        setCityIds]        = useState<number[]>([]);
  const [categories, setCategories] = useState<{id:number;name:string;icon?:string}[]>([]);
  const [cities,         setCities]         = useState<{ id: number; name: string }[]>([]);
  const [zones,          setZones]          = useState<{ id: string; name: string; slug: string; width: number; height: number }[]>([]);
  const [zoneId,         setZoneId]         = useState('');
  const { dirty, markSaved } = useUnsavedChanges({title,advertiserName,adType,imageUrl,imagePreview,embedCode,targetUrl,startsAt,endsAt,priority,categoryIds,cityIds,zoneId}, !loading && !loadError);


  useEffect(() => () => { if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Vetëm JPEG, PNG ose WebP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imazhi duhet të jetë nën 5MB', 'error');
      return;
    }
    setImageFile(file);
    setImageUrl('');
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImageUrl('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return imageUrl || null;
    setUploading(true);
    try {
      const data = await uploadImages<{ url: string }>('ad-banner', [imageFile]);
      if (typeof data?.url !== 'string' || !data.url.trim()) throw new Error();
      return data.url;
    } catch {
      throw new Error('Imazhi nuk u ngarkua. Ndryshimet nuk u ruajtën; provoni përsëri.');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true); setLoadError('');
    Promise.all([
      adminFetch<AdDetail>(`/admin/ads/${id}`, token),
      adminFetch<{id:number;name:string;icon?:string}[]>('/admin/categories', token),
      adminFetch<Analytics>(`/admin/ads/${id}/analytics`, token).catch(() => { showToast('Statistikat nuk u ngarkuan. Rifreskoni për t’i provuar përsëri.', 'error'); return null; }),
      adminFetch<{ id: number; name: string }[]>('/admin/cities', token),
      adminFetch<{ id: string; name: string; slug: string; width: number; height: number }[]>('/admin/ad-zones', token),
    ]).then(([a, categories, analytics, c, z]) => {
      if (!a?.id || typeof a.title !== "string" || !a.zone?.id || !Array.isArray(c) || !Array.isArray(z) || !Array.isArray(categories)) throw new Error("Kampanja nuk u ngarkua plotësisht. Provoni përsëri.");
      setCategories(categories);
      setAd(a);
      setAnalytics(analytics);
      setCities(c ?? []);
      setZones(z ?? []);
      setZoneId(a.zone?.id ?? '');
      setTitle(a.title);
      setAdvertiserName(a.advertiserName);
      setAdType(a.adType);
      setImageUrl(a.imageUrl ?? '');
      setEmbedCode(a.embedCode ?? '');
      setTargetUrl(a.targetUrl);
      setStartsAt(localDateTime(a.startsAt));
      setEndsAt(localDateTime(a.endsAt));
      setPriority(a.priority);
      setCategoryIds(a.targetCategories?.map(tc => tc.categoryId) ?? []);
      setCityIds(a.targetCities?.map(tc => tc.cityId) ?? []);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.')).finally(() => setLoading(false));
  }, [token, id, revision]);

  async function saveAd() {
 return runAction(async () => {

    if (!token || !ad) return;
    setToast(null);
    if (!validCampaignDates(startsAt, endsAt, ad.startsAt, ad.endsAt)) { showToast('Data e përfundimit duhet të jetë pas datës së fillimit.', 'error'); return; }
    if (adType === 'IMAGE_BANNER' && !imageFile && !imageUrl) { showToast('Zgjidhni një imazh për reklamën.', 'error'); return; }
    setSaving(true);
    try {
      const finalImageUrl = await uploadImage();

      await adminFetch(`/admin/ads/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          title, advertiserName, adType, zoneId,
          imageUrl: finalImageUrl || undefined,
          embedCode: adType === 'EMBED_CODE' ? embedCode : undefined,
          targetUrl, priority,
          startsAt: campaignInstant(startsAt, ad.startsAt),
          endsAt:   campaignInstant(endsAt, ad.endsAt),
          categoryIds: categoryIds.length ? categoryIds : [],
          cityIds:     cityIds.length ? cityIds : [],
        }),
      });
      setAd(prev => prev ? { ...prev, title, advertiserName, adType, imageUrl: finalImageUrl ?? '', targetUrl, priority, startsAt: campaignInstant(startsAt, ad.startsAt), endsAt: campaignInstant(endsAt, ad.endsAt), zone: zones.find(zone => zone.id === zoneId) } : prev);
      setImageUrl(finalImageUrl ?? ''); setImageFile(null); setImagePreview('');
      markSaved({title,advertiserName,adType,imageUrl:finalImageUrl ?? '',imagePreview:'',embedCode,targetUrl,startsAt,endsAt,priority,categoryIds,cityIds,zoneId});
      showToast('Ndryshimet u ruajtën');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    } finally {
      setSaving(false);
    }

 });
}

  async function togglePause() {
 return runAction(async () => {

    if (!token || !ad) return;
    const ep = ad.isActive ? `/admin/ads/${id}/pause` : `/admin/ads/${id}/resume`;
    await adminFetch(ep, token, { method: 'POST' });
    setAd(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
    showToast(ad.isActive ? 'Kampanja u pauzua' : 'Kampanja u rifillua');

 });
}

  async function softDelete() {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/ads/${id}`, token, { method: 'DELETE' });
    markSaved();
    router.push('/admin/reklamat');

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-white rounded animate-pulse" />
        <div className="h-40 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!ad) return <div className="text-center py-12 text-gray-400">Reklama nuk u gjet.</div>;

  const impressions = analytics?.totalImpressions ?? ad._count?.impressions ?? 0;
  const clicks      = analytics?.totalClicks ?? ad._count?.clicks ?? 0;
  const ctrVal      = analytics?.ctr ?? (impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0);
  const unique      = analytics?.uniqueViewers ?? 0;

  const chartData = (analytics?.dailyStats ?? []).map(d => ({
    label:  new Date(d.day).toLocaleDateString('sq-AL', { month: 'short', day: 'numeric' }),
    value:  d.impressions,
    value2: d.clicks,
  }));
  const maxVal = Math.max(...chartData.map(d => Math.max(d.value, d.value2 ?? 0)), 1);

  return <ActionRegion busy={actionBusy} error={actionError}>
    {dirty && <p role="status" className="mb-3 text-sm text-amber-800">Keni ndryshime të paruajtura.</p>}
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/reklamat" className="text-xs text-gray-500 hover:text-primary transition-colors">← Prapa</Link>
          <div>
            <h1 className="text-base font-bold text-dark">{ad.title}</h1>
            <p className="text-xs text-gray-400">{ad.advertiserName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={togglePause}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ad.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`} aria-pressed={ad.isActive}>
            {ad.isActive ? '⏸ Pauzo' : '▶ Rifillo'}
          </button>
          <button onClick={() => setDelModal(true)} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors">
            Fshi
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Shfaqje Totale', value: impressions.toLocaleString(), color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Klikime Totale',    value: clicks.toLocaleString(),      color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'CTR',               value: `${ctrVal}%`,                 color: 'text-amber-800', bg: 'bg-amber-50' },
          { label: 'Shikues unikë ditorë (shuma)',     value: unique.toLocaleString(),      color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-100 shadow-sm p-4 text-center`}>
            <p className={`text-lg font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Ad preview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pamja e Reklamës</h2>
        <div className="flex items-center gap-4 flex-wrap">
          {ad.adType === 'EMBED_CODE' && ad.embedCode ? (
            <div className="w-48 h-24 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-500">
              <p className="text-sm font-bold">&lt;/&gt;</p>
              <p className="text-xs mt-1">Kod HTML/JS</p>
            </div>
          ) : ad.imageUrl ? (
            <img src={imgSrc(ad.imageUrl)} alt={ad.title} className="max-h-32 max-w-full rounded-lg border border-gray-100 object-contain" />
          ) : (
            <div className="w-48 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Nuk ka imazh</div>
          )}
          <div className="flex-1 min-w-0 text-xs text-gray-500 space-y-1">
            <p><span className="font-semibold text-gray-700">Zona:</span> {ad.zone?.name ?? '—'}</p>
            <p><span className="font-semibold text-gray-700">Lloji:</span> {AD_TYPES.find(t => t.value === ad.adType)?.label ?? ad.adType}</p>
            <p><span className="font-semibold text-gray-700">URL:</span> <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block max-w-xs">{ad.targetUrl}</a></p>
            <p><span className="font-semibold text-gray-700">Datat:</span> {new Date(ad.startsAt).toLocaleString('sq-AL')} → {new Date(ad.endsAt).toLocaleString('sq-AL')}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Shfaqje & Klikime (30 ditë)</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/70 inline-block" /> Shfaqje</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-700 inline-block" /> Klikime</span>
            </div>
          </div>
          <div aria-hidden="true"><BarChart data={chartData} maxValue={maxVal} /></div>
          <details className="mt-4"><summary className="cursor-pointer font-semibold text-sm">Shiko vlerat e sakta sipas ditës</summary><div className="overflow-auto"><table className="w-full text-sm" data-responsive="cards"><caption className="text-left py-2">30 ditët e fundit, ditë kalendarike UTC. Shfaqjet dhe klikimet janë numërime të veçanta.</caption><thead><tr><th>Data (UTC)</th><th>Shfaqje</th><th>Klikime</th><th>CTR</th></tr></thead><tbody>{analytics?.dailyStats.map(d => <tr key={d.day}><th scope="row" data-label="Data (UTC)">{d.day.slice(0,10)}</th><td data-label="Shfaqje">{d.impressions}</td><td data-label="Klikime">{d.clicks}</td><td data-label="CTR">{d.impressions ? (100*d.clicks/d.impressions).toFixed(2) : '0.00'}%</td></tr>)}</tbody></table></div></details>
        </div>
      )}

      {/* Top pages */}
      {analytics?.topPages && analytics.topPages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Faqet Kryesore</h2>
          <div className="space-y-2">
            {analytics.topPages.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                <p className="flex-1 text-xs text-gray-600 truncate">{p.pageUrl || '—'}</p>
                <span className="text-xs font-semibold text-primary shrink-0">{p.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      <ValidatedForm onSubmit={saveAd} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-dark mb-4">Ndrysho Kampanjën</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Titulli</label>
            <input type="text" required value={title} onChange={e => setTitle(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reklamues</label>
            <input type="text" required value={advertiserName} onChange={e => setAdvertiserName(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>

          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Zona</label>
            <select required value={zoneId} onChange={e => setZoneId(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option value="">— Zgjidh zonën —</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.width}×{z.height})</option>)}
            </select>
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lloji</label>
            <select value={adType} onChange={e => setAdType(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          {/* Image upload or Embed code */}
          <div className="sm:col-span-2">
            {adType === 'EMBED_CODE' ? (
              <>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kodi HTML/JavaScript</label>
                <textarea
                  value={embedCode}
                  onChange={e => setEmbedCode(e.currentTarget.value)}
                  placeholder={'<script async src="https://pagead2.googlesyndication.com/..."></script>\n<ins class="adsbygoogle" ...></ins>'}
                  rows={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">Vendos kodin e Google AdSense ose çdo kod tjetër HTML/JS.</p>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Imazhi i Reklamës</label>
                {!imageFile && !imageUrl ? (
                  <button type="button" aria-label="Zgjidh imazhin e reklamës"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                    onDragLeave={e => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        if (fileInputRef.current) fileInputRef.current.files = dt.files;
                        handleFileSelect({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <span className="block text-xs font-medium text-gray-600">Kliko ose tërhiq imazhin këtu</span>
                    <span className="block text-xs text-gray-400 mt-1">JPEG, PNG ose WebP, max 5MB</span>
                  </button>
                ) : (
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview || imgSrc(imageUrl)}
                      alt="Parashikimi i reklamës"
                      className="w-full max-h-40 object-contain bg-gray-50"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                    <button
                      type="button"
                      aria-label="Hiq imazhin e reklamës"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-700 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                <p className="text-xs text-gray-500 mt-2">Ngarkoni imazhin nga pajisja juaj. Lidhjen ku do të çojë reklama vendoseni më poshtë.</p>
              </>
            )}
          </div>

          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">URL Destinacionit</label>
            <input type="url" required value={targetUrl} onChange={e => setTargetUrl(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fillon</label>
            <input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mbaron</label>
            <input type="datetime-local" required value={endsAt} onChange={e => setEndsAt(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Prioriteti (0–100)</label>
            <input type="number" min={0} max={100} value={priority} onChange={e => setPriority(Number(e.currentTarget.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </Field>
        </div>

        <p className="text-xs text-gray-500 mt-3">Data dhe ora përdorin zonën kohore të pajisjes suaj.</p>
        {/* Multi-select targeting */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Targetimi</h3>
          <p className="text-xs text-gray-400 mb-4">Asnjë zgjedhje = shfaqet kudo. Zgjidh vetëm ato ku dëshiron të shfaqet.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategoritë</label>
                {categoryIds.length > 0 && (
                  <button type="button" onClick={() => setCategoryIds([])} className="text-xs text-red-700 hover:text-red-700">Pastro</button>
                )}
              </div>
              {categoryIds.length === 0 && (
                <p className="text-xs text-green-700 font-medium mb-1.5">Të gjitha kategoritë</p>
              )}
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
                {categories.map(c => {
                  const checked = categoryIds.includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${checked ? 'bg-primary/5' : ''}`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setCategoryIds(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                        className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="text-xs">{c.icon} {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Qytetet</label>
                {cityIds.length > 0 && (
                  <button type="button" onClick={() => setCityIds([])} className="text-xs text-red-700 hover:text-red-700">Pastro</button>
                )}
              </div>
              {cityIds.length === 0 && (
                <p className="text-xs text-green-700 font-medium mb-1.5">Të gjitha qytetet</p>
              )}
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
                {cities.map(c => {
                  const checked = cityIds.includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 ${checked ? 'bg-primary/5' : ''}`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setCityIds(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                        className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="text-xs">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={saving || uploading}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {uploading ? 'Duke ngarkuar imazhin…' : saving ? 'Duke ruajtur…' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      </ValidatedForm>

      {/* Delete modal */}
      {delModal && (
        <Modal label="Fshi Kampanjën" onClose={() => setDelModal(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <h3 className="text-sm font-bold text-dark mt-2 mb-1">Fshi Kampanjën</h3>
            <p className="text-xs text-gray-500 mb-4">Të dhënat analitike ruhen. Ky veprim mund të kthehet.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={softDelete} className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">Fshi</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
