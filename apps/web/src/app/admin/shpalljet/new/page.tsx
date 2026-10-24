'use client';
import ReferenceFeedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';

import { uploadImages } from '@/lib/image-upload';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

const IMG_SVC = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

interface SchemaField {
  name: string;
  type: 'number' | 'text' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
}

interface Category {
  id: number;
  name: string;
  icon?: string;
  attributeSchema?: { fields: SchemaField[] } | null;
  children?: { id: number; name: string; attributeSchema?: { fields: SchemaField[] } | null }[];
}

interface City {
  id: number;
  name: string;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface UploadedImage {
  url: string;       // relative: listings/year/month/id/original/file.webp
  thumbUrl: string;  // relative: /uploads/listings/.../thumb/file.webp
  mediumUrl: string; // relative: /uploads/listings/.../medium/file.webp
  preview: string;   // object URL for display (revoked on unmount)
}

const SOURCES = [
  { value: 'WHATSAPP', label: 'WhatsApp',  icon: '💬' },
  { value: 'VIBER',    label: 'Viber',     icon: '📲' },
  { value: 'SMS',      label: 'SMS',       icon: '📱' },
  { value: 'FACEBOOK', label: 'Facebook',  icon: '👍' },
  { value: 'PHONE',    label: 'Telefon',   icon: '📞' },
  { value: 'OTHER',    label: 'Tjetër',    icon: '📝' },
];



// ─── Image uploader ────────────────────────────────────────────────────────────

function normalise(result: { url: string; thumbUrl: string; mediumUrl: string }): Omit<UploadedImage, 'preview'> {
  // Image service returns full URLs like http://localhost:4001/uploads/...
  // Strip the domain so stored paths are relative, matching the rendering pattern
  const base = IMG_SVC;
  return {
    url:       result.url.replace(`${base}/uploads/`, ''),   // listings/.../original/file.webp
    thumbUrl:  result.thumbUrl.replace(base, ''),             // /uploads/listings/.../thumb/file.webp
    mediumUrl: result.mediumUrl.replace(base, ''),            // /uploads/listings/.../medium/file.webp
  };
}

function ImageUploader({
  images,
  uploading,
  onFilesSelected,
  onRemove,
  onReorder,
}: {
  images: UploadedImage[];
  uploading: boolean;
  onFilesSelected: (files: any) => void;
  onRemove: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const dragFrom   = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Drop-zone drag (files from OS)
  const onZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) onFilesSelected(e.dataTransfer.files);
  }, [onFilesSelected]);

  // Item drag-to-reorder
  function onItemDragStart(e: React.DragEvent, idx: number) {
    dragFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }
  function onItemDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(idx);
  }
  function onItemDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(null);
    if (dragFrom.current !== null && dragFrom.current !== idx) {
      onReorder(dragFrom.current, idx);
    }
    dragFrom.current = null;
  }
  function onItemDragEnd() {
    setDragOver(null);
    dragFrom.current = null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Imazhet
          {images.length > 0 && (
            <span className="ml-1.5 text-gray-400 font-normal normal-case">
              {images.length} / 8 · tërhiq për të rirenditur
            </span>
          )}
        </h2>
        {images.length < 8 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            + Shto foto
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.currentTarget.value = ''; }}
      />

      {/* Drop zone — shown when no images yet */}
      {images.length === 0 && (
        <div
          onDrop={onZoneDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Duke ngarkuar...</p>
            </div>
          ) : (
            <>
              <p className="text-2xl text-gray-300 mb-1">📷</p>
              <p className="text-xs font-semibold text-gray-500">Kliko ose tërhiq foto këtu</p>
              <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP · maks 5 MB · deri 8 foto</p>
            </>
          )}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, idx) => (
            <div
              key={img.preview}
              draggable
              onDragStart={e => onItemDragStart(e, idx)}
              onDragOver={e => onItemDragOver(e, idx)}
              onDrop={e => onItemDrop(e, idx)}
              onDragEnd={onItemDragEnd}
              className={`relative group rounded-lg overflow-hidden border-2 transition-colors cursor-grab active:cursor-grabbing aspect-video bg-gray-100 ${
                dragOver === idx ? 'border-primary scale-95' : 'border-transparent'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={`Imazhi ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Primary badge */}
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 bg-primary text-white rounded shadow">
                  ★ Kryesor
                </span>
              )}

              {/* Position number */}
              {idx > 0 && (
                <span className="absolute top-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 bg-black/50 text-white rounded">
                  {idx + 1}
                </span>
              )}

              {/* Drag handle hint */}
              <span className="absolute top-1.5 right-1.5 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                ⠿
              </span>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute bottom-1.5 right-1.5 w-5 h-5 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-all"
                title="Fshi"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add more slot */}
          {images.length < 8 && (
            <div
              onDrop={onZoneDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-xl text-gray-300">+</span>
              )}
            </div>
          )}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Imazhi i parë është foto kryesore. Tërhiq për të rirenditur.
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewManualListingPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [referenceError, setReferenceError] = useState('');
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceRevision, retryReferences] = useState(0);
  const router    = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities,     setCities]     = useState<City[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [categoryId,    setCategoryId]    = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [cityId,        setCityId]        = useState('');
  const [price,         setPrice]         = useState('');
  const [phones,        setPhones]        = useState<string[]>(['']);
  const [source,        setSource]        = useState('WHATSAPP');
  const [notes,         setNotes]         = useState('');
  const [isFeatured,    setIsFeatured]    = useState(false);
  const [isUrgent,      setIsUrgent]      = useState(false);
  const [dynAttrs,      setDynAttrs]      = useState<Record<string, string>>({});

  // Images
  const [images, setImages] = useState<UploadedImage[]>([]);
  // Stable temp ID scoped to this page session

  // User search
  const [userSearch,    setUserSearch]    = useState('');
  const [userResults,   setUserResults]   = useState<UserResult[]>([]);
  const [selectedUser,  setSelectedUser]  = useState<UserResult | null>(null);
  const [userSearching, setUserSearching] = useState(false);
  const { dirty, markSaved } = useUnsavedChanges({title,description,categoryId,subcategoryId,cityId,price,phones,source,notes,isFeatured,isUrgent,dynAttrs,images,selectedUser}, !referenceLoading && !referenceError);


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { images.forEach(img => URL.revokeObjectURL(img.preview)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    setReferenceLoading(true); setReferenceError('');
    Promise.all([
      adminFetch<Category[]>('/admin/categories', token),
      adminFetch<City[]>('/admin/cities', token),
    ]).then(([cats, cits]) => {
      setCategories(cats);
      setCities(cits);
    }).catch(() => setReferenceError('Të dhënat e formularit nuk u ngarkuan.')).finally(() => setReferenceLoading(false));
  }, [token, referenceRevision]);

  async function searchUsers() {
    if (!token || userSearch.trim().length < 2) return;
    setUserSearching(true);
    try {
      const res = await adminFetch<{ data: UserResult[] }>(
        `/admin/users?search=${encodeURIComponent(userSearch)}&limit=8`, token
      );
      setUserResults(res.data ?? []);
    } catch {
      setUserResults([]); showToast("Kërkimi i përdoruesve dështoi. Provoni përsëri.", "error");
    } finally {
      setUserSearching(false);
    }
  }

  // ─── Image upload ──────────────────────────────────────────────────────────

  async function handleFilesSelected(fileList: any) {
    const files = Array.from(fileList) as File[];
    if (uploading) return;
    if (files.length > 8 - images.length) { showToast(`Zgjodhët ${files.length} foto; kanë mbetur ${Math.max(0,8-images.length)} vende. Nuk u ngarkua asnjë. Zgjidhni më pak foto.`, "error"); return; }
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await uploadImages<Array<{ url: string; thumbUrl: string; mediumUrl: string }>>('listing', files);
      const newImgs: UploadedImage[] = results.map((r, i) => ({
        ...normalise(r),
        preview: URL.createObjectURL(files[i]),
      }));
      setImages(prev => [...prev, ...newImgs]);
      showToast(`${newImgs.length} foto u ngarkuan.`);
    } catch {
      showToast('Gabim gjatë ngarkimit të fotos', 'error');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function reorderImages(from: number, to: number) {
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  const selectedCategory    = categories.find(c => c.id === Number(categoryId));
  const subcategories       = selectedCategory?.children ?? [];
  const selectedSubcategory = subcategories.find(s => s.id === Number(subcategoryId));
  const activeSchema: SchemaField[] = (
    selectedSubcategory?.attributeSchema?.fields ??
    selectedCategory?.attributeSchema?.fields ??
    []
  ).filter(f => f.name !== 'price');

  async function handleSubmit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    if (!selectedUser)       { showToast('Zgjidh një përdorues', 'error'); return; }
    if (!title.trim())       { showToast('Titulli është i detyrueshëm', 'error'); return; }
    if (!description.trim()) { showToast('Përshkrimi është i detyrueshëm', 'error'); return; }
    if (!categoryId)         { showToast('Zgjidh kategorinë', 'error'); return; }
    if (!cityId)             { showToast('Zgjidh qytetin', 'error'); return; }

    // Build attributes from price + dynamic fields + phones
    const attrs: Record<string, unknown> = {};
    if (price) attrs.price = Number(price);
    const cleanPhones = phones.map(p => p.trim()).filter(Boolean);
    if (cleanPhones.length > 0) attrs.telefoni = cleanPhones;
    for (const [k, v] of Object.entries(dynAttrs)) {
      if (v !== '') attrs[k] = v;
    }

    const body: Record<string, unknown> = {
      title:        title.trim(),
      description:  description.trim(),
      categoryId:   Number(categoryId),
      cityId:       Number(cityId),
      userId:       selectedUser.id,
      source,
      isFeatured,
      isUrgent,
      ...(subcategoryId && { subcategoryId: Number(subcategoryId) }),
      ...(notes         && { notes }),
      ...(images.length > 0 && {
        images: images.map(({ url, thumbUrl, mediumUrl }) => ({ url, thumbUrl, mediumUrl })),
      }),
      attributes: attrs,
    };

    setSaving(true);
    try {
      await adminFetch('/admin/listings', token, { method: 'POST', body: JSON.stringify(body) });
      markSaved();
      router.push('/admin/shpalljet');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjatë ruajtjes', 'error');
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <button aria-label="Kthehu te shpalljet" onClick={() => { if (!dirty || confirm("Keni ndryshime të paruajtura. Largoheni pa i ruajtur?")) { markSaved(); router.back(); } }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-dark">Shpallje e Re (Manual)</h1>
          <p className="text-gray-400 text-xs mt-0.5">Shto shpallje nga WhatsApp, Viber, SMS, Facebook ose telefonatë</p>
        </div>
      </div>

      <ValidatedForm onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ─── Main form (left 2/3) ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Source channel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Burimi i Shpalljes</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SOURCES.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setSource(s.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                      source === s.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <span className="text-xl">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign to user */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Cakto Përdoruesin</h2>
              {selectedUser ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                    {selectedUser.phone && <p className="text-xs text-gray-400">{selectedUser.phone}</p>}
                  </div>
                  <button type="button" onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-red-700 transition-colors text-lg leading-none">×</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" aria-label="Kërko autorin" placeholder="Kërko me emër, email ose telefon…"
                      value={userSearch} onChange={e => setUserSearch(e.currentTarget.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUsers())}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                    <button type="button" onClick={searchUsers} disabled={userSearching}
                      className="px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors">
                      {userSearching ? '…' : 'Kërko'}
                    </button>
                  </div>
                  {userResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                      {userResults.map(u => (
                        <button key={u.id} type="button"
                          onClick={() => { setSelectedUser(u); setUserResults([]); setUserSearch(''); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-dark truncate">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          {u.phone && <span className="text-xs text-gray-400 shrink-0">{u.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Listing details */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Detajet e Shpalljes</h2>

              <Field>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Titulli <span className="text-red-700">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.currentTarget.value)}
                  placeholder="p.sh. Shitet banesa 3+1 në Prishtinë"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary" />
              </Field>

              <Field>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Përshkrimi <span className="text-red-700">*</span></label>
                <textarea value={description} onChange={e => setDescription(e.currentTarget.value)}
                  rows={4} placeholder="Shkruaj detajet e shpalljes siç i mori nga klienti…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kategoria <span className="text-red-700">*</span></label>
                  <select value={categoryId}
                    onChange={e => { setCategoryId(e.currentTarget.value); setSubcategoryId(''); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary">
                    <option value="">Zgjidh kategorinë</option>
                    {categories.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nënkategoria</label>
                  <select value={subcategoryId} onChange={e => setSubcategoryId(e.currentTarget.value)}
                    disabled={subcategories.length === 0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary disabled:opacity-50 disabled:bg-gray-50">
                    <option value="">— Nënkategori —</option>
                    {subcategories.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Qyteti <span className="text-red-700">*</span></label>
                  <select value={cityId} onChange={e => setCityId(e.currentTarget.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary">
                    <option value="">Zgjidh qytetin</option>
                    {cities.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Çmimi (€)</label>
                  <input type="number" min={0} value={price} onChange={e => setPrice(e.currentTarget.value)}
                    placeholder="p.sh. 85000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary" />
                </Field>
              </div>

              {/* Dynamic category-specific fields */}
              {activeSchema.length > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detajet e Kategorisë</p>
                  <div className="grid grid-cols-2 gap-3">
                    {activeSchema.map(field => (
                      <div key={field.name}>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}{field.required ? ' *' : ''}</label>
                        {field.type === 'select' ? (
                          <select
                            value={dynAttrs[field.name] ?? ''}
                            onChange={e => { const value = e.currentTarget.value; setDynAttrs(prev => ({ ...prev, [field.name]: value })); }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary bg-white">
                            <option value="">— Zgjidh —</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={dynAttrs[field.name] ?? ''}
                            onChange={e => { const value = e.currentTarget.value; setDynAttrs(prev => ({ ...prev, [field.name]: value })); }}
                            placeholder={field.label}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone numbers (multiple) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Numrat e Telefonit</label>
                  {phones.length < 3 && (
                    <button type="button" onClick={() => setPhones(prev => [...prev, ''])}
                      className="text-xs font-semibold text-primary hover:underline">+ Shto numër</button>
                  )}
                </div>
                <div className="space-y-2">
                  {phones.map((p, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input aria-label={`Telefoni ${idx + 1}`} type="tel" value={p}
                        onChange={e => { const value = e.currentTarget.value; setPhones(prev => prev.map((v, i) => i === idx ? value : v)); }}
                        placeholder="+383 4X XXX XXX"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary" />
                      {phones.length > 1 && (
                        <button type="button" onClick={() => setPhones(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 text-red-700 hover:text-red-700 text-lg font-bold" title="Hiq">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Lëre bosh nëse do të përdoret telefoni i llogarisë</p>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded" />
                  <span className="text-xs font-semibold text-gray-700">E veçuar (featured)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded" />
                  <span className="text-xs font-semibold text-gray-700">Urgjente</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Shënime Interne</h2>
              <textarea aria-label="Shënime interne" value={notes} onChange={e => setNotes(e.currentTarget.value)}
                rows={2} placeholder="p.sh. Klienti tha se çmimi është i negociueshëm, kërkon shitje urgjente…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary resize-none" />
              <p className="text-xs text-gray-400 mt-1">Shënimet regjistrohen në log-un e moderimit, nuk shfaqen publikisht</p>
            </div>
          </div>

          {/* ─── Sidebar (right 1/3) ──────────────────────────────────── */}
          <div className="space-y-4">

            {/* Image uploader */}
            <ImageUploader
              images={images}
              uploading={uploading}
              onFilesSelected={handleFilesSelected}
              onRemove={removeImage}
              onReorder={reorderImages}
            />

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Përmbledhja</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Burimi</dt>
                  <dd className="font-semibold text-dark">
                    {SOURCES.find(s => s.value === source)?.icon} {SOURCES.find(s => s.value === source)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Statusi</dt>
                  <dd className="font-semibold text-green-700">Publikuar menjëherë</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Përdoruesi</dt>
                  <dd className="font-semibold text-dark truncate max-w-30">{selectedUser?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Imazhe</dt>
                  <dd className="font-semibold text-dark">{images.length}</dd>
                </div>
                {price && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Çmimi</dt>
                    <dd className="font-semibold text-dark">€{Number(price).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Submit */}
            <button type="submit" disabled={saving || uploading}
              className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Duke shtuar…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Shto Shpallje
                </>
              )}
            </button>
          </div>
        </div>
      </ValidatedForm>
    </div>
  </ActionRegion>;
}
