'use client';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';

import { uploadImages } from '@/lib/image-upload';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { imgSrc } from '@/lib/utils';

const IMG_SVC = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

interface SchemaField {
  name: string;
  type: 'number' | 'text' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
}

interface Category { id: number; name: string; icon?: string; attributeSchema?: { fields: SchemaField[] } | null; children?: { id: number; name: string; attributeSchema?: { fields: SchemaField[] } | null }[] }
interface City     { id: number; name: string }

interface ListingImage {
  id: string;
  url: string;
  thumbUrl: string;
  mediumUrl: string;
  position: number;
  isPrimary: boolean;
}

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  isFeatured: boolean;
  isUrgent: boolean;
  viewsCount: number;
  contactClicks: number;
  attributes: Record<string, unknown>;
  categoryId: number;
  subcategoryId?: number | null;
  cityId: number;
  expiresAt: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  category?: { id: number; name: string };
  subcategory?: { id: number; name: string } | null;
  city?: { id: number; name: string };
  images?: ListingImage[];
}

const STATUS_OPTIONS = [
  { value: 'PUBLISHED',      label: 'Publikuar'  },
  { value: 'PENDING_REVIEW', label: 'Në Pritje'  },
  { value: 'EXPIRED',        label: 'Skaduar'    },
  { value: 'DRAFT',          label: 'Draft'      },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  PUBLISHED:      { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-200' },
  PENDING_REVIEW: { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200' },
  REJECTED:       { bg: 'bg-red-50',    text: 'text-red-700',    ring: 'ring-red-200' },
  EXPIRED:        { bg: 'bg-gray-100',  text: 'text-gray-500',   ring: 'ring-gray-200' },
  DRAFT:          { bg: 'bg-slate-50',  text: 'text-slate-600',  ring: 'ring-slate-200' },
  ARCHIVED:       { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200' },
};



const inputCls  = 'w-full max-w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary';
const selectCls = 'w-full max-w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary bg-white';

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-800 uppercase tracking-wide mb-1">{children}</label>;
}

// ─── Normalise image-service URLs to relative paths ────────────────────────

function normalise(result: { url: string; thumbUrl: string; mediumUrl: string }): { url: string; thumbUrl: string; mediumUrl: string } {
  const base = IMG_SVC;
  return {
    url:       result.url.replace(`${base}/uploads/`, ''),
    thumbUrl:  result.thumbUrl.replace(base, ''),
    mediumUrl: result.mediumUrl.replace(base, ''),
  };
}

export default function AdminListingEditPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const params    = useParams();
  const router    = useRouter();
  const id        = params.id as string;

  const [listing,    setListing]    = useState<ListingDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities,     setCities]     = useState<City[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editable fields
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [status,        setStatus]        = useState('');
  const [categoryId,    setCategoryId]    = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [cityId,        setCityId]        = useState('');
  const [isFeatured,    setIsFeatured]    = useState(false);
  const [isUrgent,      setIsUrgent]      = useState(false);
  const [phones,        setPhones]        = useState<string[]>(['']);
  const [attrEntries,   setAttrEntries]   = useState<{ key: string; value: string }[]>([]);

  // Image management
  const [images,     setImages]     = useState<ListingImage[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const [dragFrom,   setDragFrom]   = useState<number | null>(null);

  // Social media publishing
  const [socialPlatforms, setSocialPlatforms] = useState<Record<string, boolean>>({ facebook: false, twitter: false, instagram: false });
  const [publishing,      setPublishing]      = useState(false);
  const [socialResults,   setSocialResults]   = useState<{ platform: string; success: boolean; url?: string; error?: string }[] | null>(null);
  const [dragOver,   setDragOver]   = useState<number | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const { dirty, markSaved } = useUnsavedChanges({title,description,status,categoryId,subcategoryId,cityId,isFeatured,isUrgent,phones,attrEntries}, !loading && !loadError);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = descRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [description]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });

  };

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true); setLoadError('');
    Promise.all([
      adminFetch<ListingDetail>(`/admin/listings/${id}`, token),
      adminFetch<Category[]>('/categories', token),
      adminFetch<City[]>('/cities', token),
    ]).then(([l, cats, cits]) => {
      if (!l?.id || typeof l.title !== "string" || typeof l.description !== "string" || !Array.isArray(l.images) || !Array.isArray(cats) || !Array.isArray(cits)) throw new Error("Të dhënat e shpalljes nuk janë të plota. Provoni përsëri.");
      setListing(l);
      setCategories(Array.isArray(cats) ? cats : []);
      setCities(Array.isArray(cits) ? cits : []);
      // Pre-fill
      setTitle(l.title);
      setDescription(l.description);
      setStatus(l.status);
      setCategoryId(String(l.categoryId));
      setSubcategoryId(l.subcategoryId ? String(l.subcategoryId) : '');
      setCityId(String(l.cityId));
      setIsFeatured(l.isFeatured);
      setIsUrgent(l.isUrgent);
      // Images
      setImages((l.images ?? []).sort((a, b) => a.position - b.position));
      // Phone numbers — extract from attributes
      const rawPhone = l.attributes?.telefoni ?? l.attributes?.phone;
      const phoneList: string[] = (Array.isArray(rawPhone) ? rawPhone : (rawPhone ? [rawPhone] : [])).map(v => String(v ?? ''));
      setPhones(phoneList.length > 0 ? phoneList : ['']);
      // Convert attributes object to key-value entries (excluding phone keys)
      const PHONE_KEYS = ['telefoni', 'phone'];
      const entries = Object.entries(l.attributes ?? {})
        .filter(([key]) => !PHONE_KEYS.includes(key))
        .map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        }));
      setAttrEntries(entries.length > 0 ? entries : [{ key: '', value: '' }]);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, id, revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCategory    = categories.find(c => c.id === Number(categoryId));
  const subcategories       = selectedCategory?.children ?? [];
  const selectedSubcategory = subcategories.find(s => s.id === Number(subcategoryId));
  const activeSchema: SchemaField[] = selectedSubcategory?.attributeSchema?.fields ?? selectedCategory?.attributeSchema?.fields ?? [];

  // ─── Image handlers ──────────────────────────────────────────────────────

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!token || !window.confirm('Fshi këtë foto?')) return;
    try {
      await adminFetch(`/admin/listings/${id}/images/${imageId}`, token, { method: 'DELETE' });
      setImages(prev => {
        const filtered = prev.filter(img => img.id !== imageId);
        return filtered.map((img, i) => ({ ...img, position: i, isPrimary: i === 0 }));
      });
      showToast('Foto u fshi');
    } catch {
      showToast('Gabim gjatë fshirjes së fotos', 'error');
    }
  }, [token, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    if (!token) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, position: i, isPrimary: i === 0 }));
    setImages(updated);

    try {
      await adminFetch(`/admin/listings/${id}/images/reorder`, token, {
        method: 'PATCH',
        body: JSON.stringify({ imageIds: updated.map(img => img.id) }),
      });
      showToast('Renditja u ruajt');
    } catch {
      showToast('Gabim gjatë rirenditjes', 'error');
    }
  }, [token, id, images]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUploadImages = useCallback(async (files: FileList) => {
    if (!token || !id) return;
    setUploading(true);
    try {
      const uploaded = await uploadImages<Array<{ url: string; thumbUrl: string; mediumUrl: string }>>('listing', Array.from(files));
      const normalised = uploaded.map(normalise);

      const created: ListingImage[] = await adminFetch(`/admin/listings/${id}/images`, token, {
        method: 'POST',
        body: JSON.stringify({ images: normalised }),
      });

      setImages(prev => [...prev, ...created]);
      showToast(`${uploaded.length} foto u ngarkuan`);
    } catch {
      showToast('Gabim gjatë ngarkimit të fotove', 'error');
    } finally {
      setUploading(false);
    }
  }, [token, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag handlers for image reorder
  function onItemDragStart(e: React.DragEvent, idx: number) {
    setDragFrom(idx);
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
    if (dragFrom !== null && dragFrom !== idx) {
      handleReorder(dragFrom, idx);
    }
    setDragFrom(null);
  }
  function onItemDragEnd() {
    setDragOver(null);
    setDragFrom(null);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function save() {
 return runAction(async () => {

    if (!token) return;
    setSaving(true);
    try {
      // Build attributes from visual key-value editor
      const parsedAttributes: Record<string, unknown> = {};
      for (const entry of attrEntries) {
        const k = entry.key.trim();
        if (!k) continue;
        // Try to parse numbers and booleans; arrays/objects from JSON
        const v = entry.value;
        if (v === 'true') parsedAttributes[k] = true;
        else if (v === 'false') parsedAttributes[k] = false;
        else if (v !== '' && !isNaN(Number(v)) && v.trim() !== '') parsedAttributes[k] = Number(v);
        else if ((v.startsWith('[') || v.startsWith('{')) && v.length > 1) {
          try { parsedAttributes[k] = JSON.parse(v); } catch { parsedAttributes[k] = v; }
        }
        else parsedAttributes[k] = v;
      }

      // Add phone numbers to attributes
      const cleanPhones = phones.map(p => p.trim()).filter(Boolean);
      if (cleanPhones.length > 0) parsedAttributes.telefoni = cleanPhones;

      await adminFetch(`/admin/listings/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          title:        title.trim(),
          description:  description.trim(),
          status,
          categoryId:   Number(categoryId),
          subcategoryId: subcategoryId ? Number(subcategoryId) : null,
          cityId:       Number(cityId),
          isFeatured,
          isUrgent,
          attributes:   parsedAttributes,
        }),
      });
      markSaved(); showToast('Ndryshimet u ruajtën');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjatë ruajtjes', 'error');
    } finally {
      setSaving(false);
    }

 });
}

  async function publishToSocial() {
 return runAction(async () => {

    if (!token) return;
    const selected = Object.entries(socialPlatforms).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) { showToast('Zgjidh te pakten nje platforme', 'error'); return; }
    setPublishing(true);
    setSocialResults(null);
    try {
      const results = await adminFetch<{ platform: string; success: boolean; url?: string; error?: string }[]>(
        `/admin/listings/${id}/publish-social`, token,
        { method: 'POST', body: JSON.stringify({ platforms: selected }) },
      );
      setSocialResults(results);
      setSocialPlatforms(previous => Object.fromEntries(Object.entries(previous).map(([platform, selected]) => [platform, selected && !results.some(result => result.platform === platform && result.success)])) as typeof previous);
      const ok = results.filter(r => r.success).length;
      showToast(`Publikuar me sukses ne ${ok}/${results.length} platforma`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjate publikimit', 'error');
    } finally {
      setPublishing(false);
    }

 });
}


  async function deleteListing() {
 return runAction(async () => {

    if (!token || !window.confirm('Fshi këtë shpallje?')) return;
    try {
      await adminFetch(`/admin/listings/${id}`, token, { method: 'DELETE' });
      showToast('Shpallja u fshi');
      setTimeout(() => router.push('/admin/shpalljet'), 1000);
    } catch {
      showToast('Gabim gjatë fshirjes', 'error');
    }

 });
}

  async function renewListing() {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/listings/${id}/bump`, token, { method: 'POST' });
      showToast('Shpallja u rinovua — tani shfaqet në krye');
    } catch {
      showToast('Gabim gjatë rinovimit', 'error');
    }

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-12 text-gray-400">Shpallja nuk u gjet.</div>;
  }

  return <ActionRegion busy={actionBusy} error={actionError}>
    {dirty && <p role="status" className="mb-3 text-sm text-amber-800">Keni ndryshime të paruajtura.</p>}
    <div className="space-y-3 min-w-0 max-w-full overflow-x-hidden">
      {toast && <Toast {...toast} />}

      {/* ── Lightbox ── */}
      {previewImg && (
        <Modal label="Dritarja e administrimit" onClose={() => setPreviewImg(null)} className="w-[min(32rem,calc(100%-2rem))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImg}
            alt=""
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full text-lg font-bold transition-colors"
          >
            ×
          </button>
        </Modal>
      )}

      <h1 className="text-lg font-bold text-dark">Ndrysho shpalljen</h1>
      {/* ── Header: back + meta + all actions in one bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap">
        <Link href="/admin/shpalljet" className="text-xs text-gray-400 hover:text-primary shrink-0 transition-colors">
          ← Lista
        </Link>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 min-w-0">
            {listing.user && (
            <Link href={`/admin/perdoruesit/${listing.user.id}`} className="text-primary font-semibold hover:underline truncate">
              {listing.user.name}
            </Link>
          )}
          {listing.user && <span className="text-gray-300 hidden md:inline">({listing.user.email})</span>}
          <span>👁 {listing.viewsCount}</span>
          <span>📞 {listing.contactClicks}</span>
          <span className="hidden sm:inline">{new Date(listing.createdAt).toLocaleDateString('sq-AL')} – {new Date(listing.expiresAt).toLocaleDateString('sq-AL')}</span>
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          <button onClick={renewListing} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-100 transition-colors">
            ↑ Rinovo
          </button>
          <Link href={`/shpalljet/${id}`} target="_blank"
            className="px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-semibold rounded-md hover:bg-gray-50 transition-colors">
            ↗ Shiko
          </Link>
          <button onClick={deleteListing} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-md hover:bg-red-100 transition-colors">
            Fshi
          </button>
          <div className="w-px h-4 bg-gray-200 shrink-0 hidden sm:block" />
          <select aria-label="Statusi i shpalljes" value={status} onChange={e => setStatus(e.currentTarget.value)}
            className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 appearance-none cursor-pointer pr-6 ${
              STATUS_COLORS[status]?.bg ?? 'bg-gray-50'
            } ${STATUS_COLORS[status]?.text ?? 'text-gray-600'} ${STATUS_COLORS[status]?.ring ?? 'ring-gray-200'}`}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={save} disabled={saving}
            className="px-3 py-1 bg-green-700 text-white text-xs font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col md:flex-row gap-3 md:items-start">

        {/* LEFT: Photos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 w-full md:w-55 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Foto ({images.length})
            </span>
            {images.length < 8 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                + Shto
              </button>
            )}
          </div>

          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { if (e.target.files?.length) handleUploadImages(e.target.files); e.currentTarget.value = ''; }} />

          {images.length === 0 ? (
            <div
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleUploadImages(e.dataTransfer.files); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg h-20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 transition-colors"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <p className="text-xl text-gray-300">📷</p>
                  <p className="text-xs text-gray-400">Kliko ose tërhiq foto</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-3 gap-1.5">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={e => onItemDragStart(e, idx)}
                  onDragOver={e => onItemDragOver(e, idx)}
                  onDrop={e => onItemDrop(e, idx)}
                  onDragEnd={onItemDragEnd}
                  className={`relative group rounded overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing aspect-3/4 bg-gray-100 ${
                    dragOver === idx ? 'border-primary scale-95' : idx === 0 ? 'border-amber-400' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(img.thumbUrl)} alt="" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-0.5 left-0.5 text-[7px] font-bold px-1 bg-primary text-white rounded leading-tight">★</span>
                  )}
                  {idx > 0 && (
                    <span className="absolute top-0.5 left-0.5 text-[7px] font-bold px-1 bg-black/50 text-white rounded leading-tight">{idx + 1}</span>
                  )}
                  {/* View button */}
                  <button type="button" onClick={e => { e.stopPropagation(); setPreviewImg(imgSrc(img.mediumUrl || img.url)); }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Shiko">
                    ⤢
                  </button>
                  {/* Delete button */}
                  <button type="button" onClick={e => { e.stopPropagation(); handleDeleteImage(img.id); }}
                    className="absolute bottom-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Fshi">
                    ×
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <div
                  onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleUploadImages(e.dataTransfer.files); }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-3/4 rounded border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
                >
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <span className="text-lg text-gray-300">+</span>
                  }
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1.5 leading-snug">Tërhiq për rirenditje · hover për fshirje</p>
        </div>

        {/* RIGHT: Form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex-1 min-w-0 space-y-3">

          {/* Title */}
          <div>
            <Label htmlFor="listing-title">Titulli *</Label>
            <input type="text" id="listing-title" value={title} onChange={e => setTitle(e.currentTarget.value)} className={inputCls} />
          </div>

          {/* City + Featured + Urgent — one row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <Label htmlFor="listing-city">Qyteti</Label>
              <select id="listing-city" value={cityId} onChange={e => setCityId(e.currentTarget.value)} className={selectCls}>
                <option value="">— zgjidh —</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <button role="switch" aria-label="Shpallje e veçuar" aria-checked={isFeatured} onClick={() => setIsFeatured(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isFeatured ? 'bg-amber-400' : 'bg-gray-200'}`}>
                <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-gray-600 cursor-pointer select-none" onClick={() => setIsFeatured(v => !v)}>⭐ E veçuar</span>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <button role="switch" aria-label="Shpallje urgjente" aria-checked={isUrgent} onClick={() => setIsUrgent(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isUrgent ? 'bg-red-400' : 'bg-gray-200'}`}>
                <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isUrgent ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-gray-600 cursor-pointer select-none" onClick={() => setIsUrgent(v => !v)}>🔴 Urgjente</span>
            </div>
          </div>

          {/* Category + Subcategory + Phone — one row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="listing-category">Kategoria</Label>
              <select id="listing-category" value={categoryId} onChange={e => { setCategoryId(e.currentTarget.value); setSubcategoryId(''); }} className={selectCls}>
                <option value="">— zgjidh —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="listing-subcategory">Nënkategoria</Label>
              <select id="listing-subcategory" value={subcategoryId} onChange={e => setSubcategoryId(e.currentTarget.value)}
                disabled={subcategories.length === 0} className={`${selectCls} disabled:opacity-40`}>
                <option value="">— asnjë —</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="listing-phone-0">Telefoni</Label>
                {phones.length < 3 && (
                  <button type="button" onClick={() => setPhones(prev => [...prev, ''])}
                    className="text-xs font-semibold text-primary hover:underline">+ Shto</button>
                )}
              </div>
              <div className="space-y-1">
                {phones.map((p, idx) => (
                  <div key={idx} className="flex gap-1">
                    <input id={`listing-phone-${idx}`} aria-label={`Telefoni ${idx + 1}`} type="tel" value={p}
                      onChange={e => { const value = e.currentTarget.value; setPhones(prev => prev.map((v, i) => i === idx ? value : v)); }}
                      placeholder={idx === 0 ? '+383 44 123 456' : 'Numër shtesë kontakti'}
                      className={`${inputCls} flex-1`} />
                    {phones.length > 1 && (
                      <button type="button" onClick={() => setPhones(prev => prev.filter((_, i) => i !== idx))}
                        className="px-1 text-red-700 hover:text-red-700 text-sm font-bold shrink-0">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic category fields */}
          {activeSchema.length > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Detaje Kategorisë</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
                {activeSchema.map(field => {
                  const entry = attrEntries.find(e => e.key === field.name);
                  const value = entry?.value ?? '';
                  const updateField = (v: string) => {
                    setAttrEntries(prev => {
                      const exists = prev.find(e => e.key === field.name);
                      if (exists) return prev.map(e => e.key === field.name ? { ...e, value: v } : e);
                      return [...prev, { key: field.name, value: v }];
                    });
                  };
                  return (
                    <div key={field.name}>
                      <Label htmlFor={`listing-field-${field.name}`}>{field.label}{field.required ? ' *' : ''}</Label>
                      {field.type === 'select' && field.options ? (
                        <select id={`listing-field-${field.name}`} value={value} onChange={e => updateField(e.currentTarget.value)} className={selectCls}>
                          <option value="">— Zgjidh —</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input id={`listing-field-${field.name}`} type={field.type === 'number' ? 'number' : 'text'} value={value}
                          onChange={e => updateField(e.currentTarget.value)} className={inputCls} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="listing-description">Përshkrimi *</Label>
            <textarea id="listing-description" ref={descRef} rows={4} value={description}
              onChange={e => setDescription(e.currentTarget.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Atribute shtesë</Label>
              <button type="button" onClick={() => setAttrEntries(prev => [...prev, { key: '', value: '' }])}
                className="text-xs font-semibold text-primary hover:underline">+ Shto fushë</button>
            </div>
            {attrEntries.filter(entry => !activeSchema.some(f => f.name === entry.key)).length === 0 ? (
              <p className="text-xs text-gray-400">Asnjë atribut shtesë.</p>
            ) : (
              <div className="border border-gray-100 rounded-lg overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1.5fr_auto] gap-0 bg-gray-50 border-b border-gray-100 px-2 py-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Fusha</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-2">Vlera</span>
                  <span className="w-6" />
                </div>
                {attrEntries
                  .filter(entry => !activeSchema.some(f => f.name === entry.key))
                  .map((entry, _filteredIdx) => {
                    const realIdx = attrEntries.findIndex(e => e === entry);
                    return (
                      <div key={realIdx} className="grid grid-cols-[1fr_1.5fr_auto] gap-0 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <input aria-label={`Emri i atributit ${realIdx + 1}`} type="text" value={entry.key}
                          onChange={e => { const v = e.currentTarget.value; setAttrEntries(prev => prev.map((en, i) => i === realIdx ? { ...en, key: v } : en)); }}
                          placeholder="p.sh. price"
                          className="px-2 py-1.5 text-xs text-dark bg-transparent border-r border-gray-100 focus:outline-none focus:bg-blue-50/50 placeholder-gray-300" />
                        <input aria-label={`Vlera e atributit ${realIdx + 1}`} type="text" value={entry.value}
                          onChange={e => { const v = e.currentTarget.value; setAttrEntries(prev => prev.map((en, i) => i === realIdx ? { ...en, value: v } : en)); }}
                          placeholder="Vlera"
                          className="px-2 py-1.5 text-xs text-dark bg-transparent focus:outline-none focus:bg-blue-50/50 placeholder-gray-300" />
                        <button aria-label="Hiq atributin" type="button" onClick={() => setAttrEntries(prev => prev.filter((_, i) => i !== realIdx))}
                          className="w-7 flex items-center justify-center text-gray-300 hover:text-red-700 text-sm font-bold border-l border-gray-100 transition-colors">
                          ×
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Social media — aligned with right panel ── */}
      <div className="flex gap-3 items-start">
        <div className="hidden md:block w-55 shrink-0" />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide shrink-0 sm:mr-4">Publiko në rrjete:</span>
          <div className="flex flex-1 items-center border border-gray-200 rounded-lg overflow-hidden min-w-0">
            <label className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer py-2 hover:bg-gray-50 transition-colors px-1">
              <input aria-label="Facebook" type="checkbox" checked={socialPlatforms.facebook}
                onChange={e => setSocialPlatforms(p => ({ ...p, facebook: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-700 shrink-0" />
              <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span className="text-xs text-gray-600 hidden sm:inline">Facebook</span>
            </label>
            <div className="w-px h-6 bg-gray-200 shrink-0" />
            <label className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer py-2 hover:bg-gray-50 transition-colors px-1">
              <input aria-label="X / Twitter" type="checkbox" checked={socialPlatforms.twitter}
                onChange={e => setSocialPlatforms(p => ({ ...p, twitter: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-gray-300 shrink-0" />
              <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span className="text-xs text-gray-600 hidden sm:inline">X / Twitter</span>
            </label>
            <div className="w-px h-6 bg-gray-200 shrink-0" />
            <label className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer py-2 hover:bg-gray-50 transition-colors px-1">
              <input aria-label="Instagram" type="checkbox" checked={socialPlatforms.instagram}
                onChange={e => setSocialPlatforms(p => ({ ...p, instagram: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-gray-300 shrink-0" />
              <svg className="w-3.5 h-3.5 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <span className="text-xs text-gray-600 hidden sm:inline">Instagram</span>
            </label>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 sm:pl-3 shrink-0">
            {socialResults && (
              <div className="flex gap-1.5">
                {socialResults.map(r => (
                  <span key={r.platform} className={`text-xs px-2 py-0.5 rounded-md font-medium ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {r.success ? (r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline capitalize">{r.platform} ↗</a> : `${r.platform} ✓`) : `${r.platform} ✗ — ${r.error ?? 'Publikimi dështoi'}`}
                  </span>
                ))}
              </div>
            )}
            <button onClick={publishToSocial} disabled={publishing || !Object.values(socialPlatforms).some(Boolean)}
              className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {publishing ? 'Duke publikuar...' : 'Publiko'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </ActionRegion>;
}
