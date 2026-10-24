'use client';
import ReferenceFeedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';

import { uploadImages } from '@/lib/image-upload';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { imgSrc } from '@/lib/utils';
import { validCampaignDates } from '@/lib/campaign-dates';


interface Zone {
  id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  maxAds: number;
  description?: string;
}

const AD_TYPES = [
  { value: 'IMAGE_BANNER',       label: 'Banner (Imazh)'   },
];



export default function NewAdPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [referenceError, setReferenceError] = useState('');
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceRevision, retryReferences] = useState(0);
  const router    = useRouter();

  const [zones,   setZones]   = useState<Zone[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [title,          setTitle]          = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [zoneId,         setZoneId]         = useState('');
  const [adType,         setAdType]         = useState('IMAGE_BANNER');
  const [imageUrl,       setImageUrl]       = useState('');
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
  const [embedCode,      setEmbedCode]      = useState('');
  const [isActive,       setIsActive]       = useState(true);
  const { dirty, markSaved } = useUnsavedChanges({title,advertiserName,adType,imageUrl,imagePreview,embedCode,targetUrl,startsAt,endsAt,priority,categoryIds,cityIds,zoneId,isActive}, !referenceLoading && !referenceError);


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
    if (!token) return;
    setReferenceLoading(true); setReferenceError('');
    Promise.all([
      adminFetch<Zone[]>('/admin/ad-zones', token),
      adminFetch<{id:number;name:string;icon?:string}[]>('/admin/categories', token),
      adminFetch<{ id: number; name: string }[]>('/admin/cities', token),
    ]).then(([z, categories, c]) => {
      if (!Array.isArray(z) || !Array.isArray(c) || !Array.isArray(categories)) throw new Error();
      setCategories(categories);
      setZones(z ?? []);
      setCities(c ?? []);
    }).catch(() => setReferenceError('Të dhënat e formularit nuk u ngarkuan.')).finally(() => setReferenceLoading(false));
  }, [token, referenceRevision]);

  const selectedZone = zones.find(z => z.id === zoneId);

  async function handleSubmit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    setToast(null);
    if (!title || !advertiserName || !zoneId || !targetUrl || !startsAt || !endsAt) {
      showToast('Plotëso të gjitha fushat e detyrueshme', 'error');
      return;
    }
    if (!validCampaignDates(startsAt, endsAt)) { showToast('Data e përfundimit duhet të jetë pas datës së fillimit.', 'error'); return; }
    if (!imageFile && !imageUrl) { showToast('Zgjidhni një imazh për reklamën.', 'error'); return; }
    setSaving(true);
    try {
      const finalImageUrl = await uploadImage();

      const body: Record<string, unknown> = {
        title, advertiserName, zoneId, adType, targetUrl,
        startsAt: new Date(startsAt).toISOString(),
        endsAt:   new Date(endsAt).toISOString(),
        priority, isActive,
      };
      if (finalImageUrl) body.imageUrl = finalImageUrl;
      if (adType === 'EMBED_CODE' && embedCode) body.embedCode = embedCode;
      if (categoryIds.length) body.categoryIds = categoryIds;
      if (cityIds.length)     body.cityIds     = cityIds;

      const created = await adminFetch<{ id: string }>('/admin/ads', token, {
        method: 'POST', body: JSON.stringify(body),
      });
      if (!created?.id) throw new Error('Krijimi nuk u konfirmua. Kontrolloni listën e kampanjave përpara se të provoni përsëri.');
      markSaved();
      router.push(`/admin/reklamat/${created.id}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjatë krijimit', 'error');
    } finally {
      setSaving(false);
    }

 });
}

  if (referenceError) return <ReferenceFeedback message={referenceError} type="error" retry={() => retryReferences(n => n+1)} />;
  if (referenceLoading) return <p role="status">Duke ngarkuar formularin…</p>;
  return <ActionRegion busy={actionBusy} error={actionError}>
    {dirty && <p role="status" className="mb-3 text-sm text-amber-800">Keni ndryshime të paruajtura.</p>}
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex items-center gap-3">
        <Link href="/admin/reklamat" className="text-xs text-gray-500 hover:text-primary transition-colors">← Prapa</Link>
        <div>
          <h1 className="text-base font-bold text-dark">Reklamë e Re</h1>
          <p className="text-gray-400 text-xs">Krijo një kampanjë reklamuese</p>
        </div>
      </div>

      <ValidatedForm onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Informacioni Bazë</h2>
            <div className="space-y-3">
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Titulli <span className="text-red-700">*</span>
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.currentTarget.value)} placeholder="p.sh. Oferta Vere 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Emri i Reklamuesit <span className="text-red-700">*</span>
                </label>
                <input type="text" value={advertiserName} onChange={e => setAdvertiserName(e.currentTarget.value)} placeholder="p.sh. Kompania XYZ"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Zona <span className="text-red-700">*</span>
                  </label>
                  <select value={zoneId} onChange={e => setZoneId(e.currentTarget.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required>
                    <option value="">Zgjidh zonën…</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.width}×{z.height})</option>
                    ))}
                  </select>
                  {selectedZone?.description && (
                    <p className="text-xs text-gray-400 mt-1">{selectedZone.description}</p>
                  )}
                </Field>
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Lloji</label>
                  <select value={adType} onChange={e => setAdType(e.currentTarget.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Content: Image or Embed Code */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
              {adType === 'EMBED_CODE' ? 'Kodi i Reklamës' : 'Imazhi & Lidhja'}
            </h2>
            <div className="space-y-3">
              {adType === 'EMBED_CODE' ? (
                /* Embed code textarea */
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Kodi HTML/JavaScript <span className="text-red-700">*</span>
                  </label>
                  <textarea
                    value={embedCode}
                    onChange={e => setEmbedCode(e.currentTarget.value)}
                    placeholder={'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n<!-- Ad Unit -->\n<ins class="adsbygoogle" ...></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'}
                    rows={8}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Vendos kodin e Google AdSense, ose çdo kod tjetër HTML/JS për reklamë.
                  </p>
                </Field>
              ) : (
                /* Image upload */
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Imazhi i Reklamës</label>

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
                          if (fileInputRef.current) { fileInputRef.current.files = dt.files; }
                          handleFileSelect({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                      className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <span className="block text-2xl mb-2" aria-hidden="true">📁</span>
                      <span className="block text-xs font-medium text-gray-600">Kliko ose tërhiq imazhin këtu</span>
                      <span className="block text-xs text-gray-400 mt-1">JPEG, PNG ose WebP, max 5MB</span>
                      {selectedZone && (
                        <span className="block text-xs text-primary mt-1 font-medium">Dimensionet e sugjeruara: {selectedZone.width}×{selectedZone.height}px</span>
                      )}
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
                      {imageFile && (
                        <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-0.5">
                          <p className="text-xs text-gray-500 truncate max-w-50">{imageFile.name}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <p className="text-xs text-gray-500 mt-2">Ngarkoni imazhin nga pajisja juaj. Lidhjen ku do të çojë reklama vendoseni më poshtë.</p>

                  {selectedZone && !imageFile && !imageUrl && (
                    <p className="text-xs text-gray-400 mt-1">Dimensionet e sugjeruara: {selectedZone.width}×{selectedZone.height}px</p>
                  )}
                </Field>
              )}
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  URL e Destinacionit <span className="text-red-700">*</span>
                </label>
                <input type="url" value={targetUrl} onChange={e => setTargetUrl(e.currentTarget.value)} placeholder="https://example.com/faqja"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required />
              </Field>
            </div>
          </div>

          {/* Dates & Priority */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Datat & Prioriteti</h2>
            <p className="text-xs text-gray-500 mb-3">Data dhe ora përdorin zonën kohore të pajisjes suaj.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Fillon <span className="text-red-700">*</span>
                </label>
                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.currentTarget.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Mbaron <span className="text-red-700">*</span>
                </label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.currentTarget.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Prioriteti (0–100)
                </label>
                <input type="number" min={0} max={100} value={priority} onChange={e => setPriority(Number(e.currentTarget.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button type="button" role="switch" aria-label="Kampanja aktive" aria-checked={isActive} onClick={() => setIsActive(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-gray-200'}`}>
                    <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs font-semibold text-gray-600">Aktive menjëherë</span>
                </label>
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Targetimi <span className="text-gray-400 font-normal normal-case">(opsional)</span></h2>
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
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setCategoryIds(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
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
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setCityIds(prev => checked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — preview + submit */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pamja Paraprake</h2>
            {selectedZone ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center"
                style={{ minHeight: Math.min(selectedZone.height, 200) + 'px' }}>
                {adType === 'EMBED_CODE' && embedCode ? (
                  <div className="w-full p-3 text-center">
                    <p className="text-xs font-medium text-gray-500 mb-1">&lt;/&gt; Kod HTML/JS</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{embedCode.slice(0, 80)}…</p>
                  </div>
                ) : (imagePreview || imageUrl) ? (
                  <img src={imagePreview || imgSrc(imageUrl)} alt={title} className="max-w-full max-h-48 object-contain"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    <p className="text-2xl mb-2">🖼️</p>
                    <p className="text-xs">{selectedZone.width}×{selectedZone.height}px</p>
                    <p className="text-xs mt-1">{selectedZone.name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                <p className="text-xs">Zgjidh një zonë për të parë pamjen</p>
              </div>
            )}
            {title && <p className="text-xs font-semibold text-dark mt-2 truncate">{title}</p>}
            {advertiserName && <p className="text-xs text-gray-400">{advertiserName}</p>}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Përmbledhja</h2>
            {[
              { label: 'Zona',     value: selectedZone?.name || '—' },
              { label: 'Lloji',    value: AD_TYPES.find(t => t.value === adType)?.label || '—' },
              { label: 'Prioriteti', value: String(priority) },
              { label: 'Fillon',   value: startsAt ? new Date(startsAt).toLocaleDateString('sq-AL') : '—' },
              { label: 'Mbaron',   value: endsAt ? new Date(endsAt).toLocaleDateString('sq-AL') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-gray-400">{label}</span>
                <span className="font-semibold text-dark truncate ml-2 max-w-[120px]">{value}</span>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving || uploading}
            className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {uploading ? 'Duke ngarkuar imazhin…' : saving ? 'Duke krijuar…' : '+ Krijo Kampanjën'}
          </button>
        </div>
      </ValidatedForm>
    </div>
  </ActionRegion>;
}
