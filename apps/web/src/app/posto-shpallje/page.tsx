'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import ConnectedField from '@/components/ui/Field';
import Feedback from '@/components/ui/Feedback';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

import { isValidElement } from 'react';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '@/contexts/AuthContext';
import { imgSrc } from '@/lib/utils';
import { uploadImages } from '@/lib/image-upload';
import { adminFetch } from '@/lib/admin-api';

interface SchemaField {
  name: string;
  type: 'number' | 'text' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  attributeSchema?: { fields: SchemaField[] } | null;
  children: { id: string; name: string; slug: string; attributeSchema?: { fields: SchemaField[] } | null }[];
}

interface ApiCity {
  id: string;
  name: string;
  slug: string;
  region: string;
}

interface UploadedImage {
  claimToken?: string;
  url: string;       // listings/year/month/tempId/original/file.webp
  thumbUrl: string;  // /uploads/listings/.../thumb/file.webp
  mediumUrl: string; // /uploads/listings/.../medium/file.webp
  preview: string;   // object URL for local preview
}

const API     = process.env.NEXT_PUBLIC_API_URL   ?? 'http://localhost:3001/api/v1';
const IMG_SVC = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

// Strip image service domain to store relative paths
function normalise(r: { claimToken?: string; url: string; thumbUrl: string; mediumUrl: string }): Omit<UploadedImage, 'preview'> {
  return {
    claimToken: r.claimToken,
    url:       r.url.replace(`${IMG_SVC}/uploads/`, ''),
    thumbUrl:  r.thumbUrl.replace(IMG_SVC, ''),
    mediumUrl: r.mediumUrl.replace(IMG_SVC, ''),
  };
}

// ─── Image uploader (same drag-to-reorder UX as admin form) ───────────────────

function ImageUploader({
  images,
  uploading,
  onFilesSelected,
  maxImages,
  onRemove,
  onReorder,
}: {
  images: UploadedImage[];
  uploading: boolean;
  maxImages: number;
  onFilesSelected: (files: any) => void;
  onRemove: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) onFilesSelected(e.dataTransfer.files);
  }, [onFilesSelected]);

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
  function onItemDragEnd() { setDragOver(null); dragFrom.current = null; }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Fotot
          {images.length > 0 && (
            <span className="ml-1.5 font-normal normal-case text-gray-400">
              {images.length}/{maxImages} · tërhiq për të rirenditur
            </span>
          )}
        </label>
        {images.length > 0 && images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold text-accent underline hover:no-underline disabled:opacity-50"
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

      {/* Drop zone */}
      {images.length === 0 && (
        <button type="button" disabled={uploading}
          onDrop={onZoneDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors bg-gray-50/50"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Duke ngarkuar...</p>
            </div>
          ) : (
            <>
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm font-semibold text-gray-600">Kliko ose tërhiq fotot këtu</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · maks 5 MB · deri {maxImages} foto</p>
              <p className="text-xs text-gray-400 mt-0.5">Foto e parë do të jetë foto kryesore</p>
            </>
          )}
        </button>
      )}

      {/* Grid */}
      {images.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <div
                key={img.preview}
                draggable
                onDragStart={e => onItemDragStart(e, idx)}
                onDragOver={e => onItemDragOver(e, idx)}
                onDrop={e => onItemDrop(e, idx)}
                onDragEnd={onItemDragEnd}
                className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-gray-100 cursor-grab active:cursor-grabbing transition-all ${
                  dragOver === idx ? 'border-accent scale-95 opacity-70' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-full h-full object-cover" />

                {idx === 0 ? (
                  <span className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 bg-accent text-white rounded-md shadow-sm">
                    ★ Kryesore
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 bg-black/50 text-white rounded-md">
                    {idx + 1}
                  </span>
                )}

                <div className="absolute bottom-1 left-1 flex gap-1">
                  <button type="button" disabled={idx === 0} onClick={() => onReorder(idx, idx-1)} aria-label={`Zhvendos foton ${idx+1} majtas`} className="rounded bg-white px-2 py-1 disabled:opacity-40">←</button>
                  <button type="button" disabled={idx === images.length-1} onClick={() => onReorder(idx, idx+1)} aria-label={`Zhvendos foton ${idx+1} djathtas`} className="rounded bg-white px-2 py-1 disabled:opacity-40">→</button>
                </div>
                <button
                  type="button"
                  aria-label={`Fshi foton ${idx+1}`}
                  onClick={() => onRemove(idx)}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-md text-xs"
                  title="Fshi"
                >
                  ×
                </button>

                {/* Drag hint */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="text-white text-lg opacity-0 group-hover:opacity-60 transition-opacity select-none">⠿</span>
                </div>
              </div>
            ))}

            {/* Add slot */}
            {images.length < maxImages && (
              <div
                onDrop={onZoneDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent/50 transition-colors bg-gray-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-xl text-gray-300">+</span>
                    <span className="text-xs text-gray-400">Shto</span>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Imazhi i parë është foto kryesore · tërhiq për të ndryshuar rendin
          </p>
        </>
      )}
    </div>
  );
}

// ─── Guest success screen ────────────────────────────────────────────────────

function GuestSuccess({ listingTitle, reference }: { listingTitle: string; reference: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-dark mb-2">Shpallja u dërgua!</h1>
      <p className="text-gray-500 mb-2">
        <strong>&ldquo;{listingTitle}&rdquo;</strong> është dërguar për moderim.
      </p>
      <p className="text-gray-400 text-sm mb-8">
        Shpallja do të shfaqet pasi të aprovohet nga ekipi ynë.
      </p>

      {reference && <p className="text-sm break-all mb-3">Referenca: <strong>{reference}</strong></p>}
      <Link href={`/kontakti?reference=${encodeURIComponent(reference)}`} className="inline-block underline text-primary mb-6">Kontakto mbështetjen për këtë shpallje</Link>
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-dark mb-1">Krijo llogari për më shumë!</h2>
        <p className="text-sm text-gray-500 mb-4">
          Me llogari mund të menaxhoni postimet e ardhshme dhe të merrni njoftime. Publikimi mund të kërkojë shqyrtim. Për ndryshime në këtë postim si mysafir, kontaktoni ekipin tonë.
        </p>
        <div className="flex gap-3">
          <Link
            href="/auth/regjistrohu"
            className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-bold text-center transition-colors"
          >
            Krijo Llogari
          </Link>
          <Link
            href="/auth/hyr"
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold text-center hover:bg-gray-50 transition-colors"
          >
            Kyçu
          </Link>
        </div>
      </div>

      <Link href="/" className="text-sm text-accent font-semibold hover:underline">
        ← Kthehu në faqen kryesore
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PostoShpalljeContent() {
  const { user, token, isLoading } = useAuth();
  const router      = useRouter();
  const searchParams = useSearchParams();
  const editId      = searchParams.get('edit'); // listing ID to edit, or null for create
  const isEditMode  = !!editId;
  const isGuest     = !user;

  // Edit mode requires login
  useEffect(() => {
    if (!isLoading && !user && isEditMode) router.replace('/auth/hyr?redirect=/posto-shpallje?edit=' + editId);
  }, [isLoading, user, isEditMode, editId, router]);

  const [categories,  setCategories]  = useState<ApiCategory[]>([]);
  const [cities,      setCities]      = useState<ApiCity[]>([]);
  const [dataError, setDataError] = useState('');
  const [dataRevision, reloadData] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(!!editId);
  const [editError, setEditError] = useState('');
  const [editingStatus, setEditingStatus] = useState('');

  // Form fields
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [categoryId,    setCategoryId]    = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [cityId,        setCityId]        = useState('');
  const [price,         setPrice]         = useState('');
  const [phones,        setPhones]        = useState<string[]>(['']);
  const [isNegotiable,  setIsNegotiable]  = useState(false);
  const [dynAttrs,      setDynAttrs]      = useState<Record<string, string>>({});

  // Guest identity fields
  const [guestName,  setGuestName]  = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Images
  const [images,    setImages]    = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [guestSuccess, setGuestSuccess] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [maxImages, setMaxImages] = useState(8);
  const [requireImage, setRequireImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const { markSaved } = useUnsavedChanges({title, description, categoryId, subcategoryId, cityId, price, phones, isNegotiable, dynAttrs, images}, isEditMode && !editLoading && !editError);
  const draftReady = useRef(false);
  const draftDone = useRef(false);
  const draftKey = `oferta-post-draft:${editId ?? 'new'}`;
  useEffect(() => {
    if (isEditMode) { draftReady.current = true; return; }
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null');
      if (saved && Date.now()-saved.at < 24*60*60*1000) {
        setDraftNotice('Drafti i mëparshëm u rikthye në këtë skedë.');
        setTitle(saved.title ?? ''); setDescription(saved.description ?? ''); setCategoryId(saved.categoryId ?? ''); setSubcategoryId(saved.subcategoryId ?? '');
        setCityId(saved.cityId ?? ''); setPrice(saved.price ?? ''); setPhones(saved.phones ?? ['']); setIsNegotiable(Boolean(saved.isNegotiable)); setDynAttrs(saved.dynAttrs ?? {});
        setGuestName(saved.guestName ?? ''); setGuestPhone(saved.guestPhone ?? ''); setGuestEmail(saved.guestEmail ?? '');
        setImages((saved.images ?? []).map((image: UploadedImage) => ({ ...image, preview: imgSrc(image.url) })));
      }
    } catch { /* unavailable browser storage must not block posting */ }
    const timer = setTimeout(() => { draftReady.current = true; }, 0);
    return () => clearTimeout(timer);
  }, [draftKey, isEditMode]);
  useEffect(() => {
    if (!draftReady.current || draftDone.current || isEditMode) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), title, description, categoryId, subcategoryId, cityId, price, phones, isNegotiable, dynAttrs, guestName, guestPhone, guestEmail, images })); setDraftNotice('Drafti u ruajt në këtë skedë për 24 orë.'); } catch { setDraftNotice('Ruajtja automatike nuk është e disponueshme në këtë shfletues.'); }
  }, [draftKey, isEditMode, title, description, categoryId, subcategoryId, cityId, price, phones, isNegotiable, dynAttrs, guestName, guestPhone, guestEmail, images]);
  function clearDraft() { draftDone.current = true; try { sessionStorage.removeItem(draftKey); } catch {} }

  function discardDraft() {
    if (!confirm('Të hiqet drafti dhe të pastrohet formulari?')) return;
    clearDraft(); setTitle(''); setDescription(''); setCategoryId(''); setSubcategoryId(''); setCityId(''); setPrice(''); setPhones(['']); setIsNegotiable(false); setDynAttrs({}); setGuestName(''); setGuestPhone(''); setGuestEmail(''); setImages([]); setDraftNotice('Drafti u hoq.');
    setTimeout(() => { draftDone.current = false; }, 0);
  }
  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { images.forEach(img => URL.revokeObjectURL(img.preview)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lookup failures are retryable and never look like a valid empty form.
  useEffect(() => {
    if (isLoading) return;
    const abort = new AbortController(); setDataLoading(true); setDataError('');
    Promise.all(['categories','cities','site-config'].map(resource => fetch(`${API}/${resource}`, { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('Lookup failed'); const data = await response.json();
      if (resource !== 'site-config' && !Array.isArray(data)) throw new Error('Invalid lookup'); return data;
    }))).then(([cats, cits, policy]) => { if (!abort.signal.aborted) {
      setCategories(cats); setCities(cits);
      setMaxImages(Math.max(1, Math.min(8, Number(policy.maxImagesPerListing) || 8))); setRequireImage(policy.requireImageToPublish === true);
    } })
      .catch(() => { if (!abort.signal.aborted) setDataError('Kategoritë, qytetet ose kushtet e publikimit nuk u ngarkuan.'); })
      .finally(() => { if (!abort.signal.aborted) setDataLoading(false); });
    return () => abort.abort();
  }, [isLoading, dataRevision]);

  // If edit mode, pre-fill form from existing listing
  useEffect(() => {
    if (!editId || !token || dataLoading) return;
    let cancelled = false;
    setEditLoading(true);
    setEditError('');
    adminFetch(`/listings/${editId}/manage`)
      .then((l: any) => {
        if (cancelled) return;
        setEditingStatus(l.status);

        setTitle(l.title ?? '');
        setDescription(l.description ?? '');
        setCategoryId(String(l.categoryId ?? l.category?.id ?? ''));
        setSubcategoryId(String(l.subcategoryId ?? l.subcategory?.id ?? ''));
        setCityId(String(l.cityId ?? l.city?.id ?? ''));
        setPrice(String(l.attributes?.price ?? ''));
        // Support old single phone and new multi-phone format
        const savedPhones = l.attributes?.telefoni;
        if (Array.isArray(savedPhones)) {
          setPhones(savedPhones.length > 0 ? savedPhones : ['']);
        } else if (savedPhones) {
          setPhones([String(savedPhones)]);
        }
        setIsNegotiable(l.attributes?.cmimi_negociueshem ?? false);
        // Pre-fill dynamic attributes from saved data
        const dyn: Record<string, string> = {};
        if (l.attributes) {
          for (const [k, v] of Object.entries(l.attributes)) {
            if (!['price', 'telefoni', 'phone', 'cmimi_negociueshem'].includes(k) && v !== null && v !== undefined) {
              dyn[k] = String(v);
            }
          }
        }
        setDynAttrs(dyn);
        if (l.images?.length) {
          setImages(l.images.map((img: any) => ({
            url:       img.url,
            thumbUrl:  img.thumbUrl,
            mediumUrl: img.mediumUrl,
            preview:   imgSrc(img.thumbUrl),
          })));
        }
      })
      .catch(() => { if (!cancelled) setEditError('Shpallja nuk u gjet ose nuk keni leje për ta ndryshuar.'); })
      .finally(() => { if (!cancelled) setEditLoading(false); });
    return () => { cancelled = true; };
  }, [editId, token, dataLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCategory    = categories.find(c => String(c.id) === categoryId);
  const subcategories       = selectedCategory?.children ?? [];
  const selectedSubcategory = subcategories.find(s => String(s.id) === subcategoryId);

  // Get the active attribute schema: subcategory overrides parent category
  const activeSchema: SchemaField[] = (
    selectedSubcategory?.attributeSchema?.fields ??
    selectedCategory?.attributeSchema?.fields ??
    []
  ).filter(f => f.name !== 'price'); // price is always shown separately

  // ─── Image upload ────────────────────────────────────────────────────────

  async function handleFilesSelected(fileList: any) {
    if (uploading) return;
    const files = Array.from(fileList) as File[];
    setUploadNotice('');
    const available = Math.max(0, maxImages - images.length);
    if (files.length > available) { setError(`Zgjodhët ${files.length} foto; mund të shtoni edhe ${available}. Zgjidhni më pak foto. Asnjë foto nuk u ngarkua.`); return; }
    const invalid = files.filter(f => !['image/jpeg','image/png','image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024);
    if (invalid.length) { setError(`Këto foto nuk u pranuan (JPEG, PNG, WebP, deri 5 MB): ${invalid.map(f => f.name).join(', ')}. Asnjë foto nuk u ngarkua; hiqini dhe provoni përsëri.`); return; }
    if (!files.length) return;
    if (isGuest && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Përfundoni verifikimin anti-bot para ngarkimit të fotove.');
      return;
    }
    setUploading(true);
    try {
      const results = await uploadImages<Array<{ claimToken?: string; url: string; thumbUrl: string; mediumUrl: string }>>(
        'listing', files, isGuest ? { turnstileToken } : undefined,
      );
      const newImgs: UploadedImage[] = results.map((r, i) => ({
        ...normalise(r),
        preview: URL.createObjectURL(files[i]),
      }));
      setImages(prev => [...prev, ...newImgs]);
      setUploadNotice(`${newImgs.length} foto u ngarkuan: ${files.map(f => f.name).join(', ')}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gabim gjatë ngarkimit të fotos. Provo sërish.');
    } finally {
      setUploading(false);
      if (isGuest) { setTurnstileToken(''); turnstileRef.current?.reset(); }
    }
  }

  function removeImage(idx: number) {
    setImages(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  function reorderImages(from: number, to: number) {
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  function requestIdFor(body: Record<string, unknown>) {
    const { turnstileToken: _token, ...content } = body;
    const fingerprint = JSON.stringify(content);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
    return submission.current.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return;
    if (requireImage && !images.length) { setError('Shtoni të paktën një foto për të dërguar shpalljen.'); return; }
    if (!title.trim() || !categoryId || !cityId || !description.trim()) {
      setError('Ju lutem plotësoni të gjitha fushat e detyrueshme.');
      return;
    }
    if (!phones[0]?.trim()) {
      setError('Ju lutem jepni numrin e telefonit.');
      return;
    }
    if (isGuest && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Ju lutem prisni verifikimin anti-bot.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      // Build attributes from dynamic fields + fixed fields
      const attrs: Record<string, unknown> = {};
      if (price) attrs.price = parseFloat(price);
      const cleanPhones = phones.map(p => p.trim()).filter(Boolean);
      if (cleanPhones.length > 0) attrs.telefoni = cleanPhones;
      attrs.cmimi_negociueshem = isNegotiable;
      // Add dynamic schema-driven attributes (convert numbers per schema)
      for (const [k, v] of Object.entries(dynAttrs)) {
        if (v === '') continue;
        const field = activeSchema.find(f => f.name === k);
        attrs[k] = field?.type === 'number' ? parseFloat(v) : v;
      }

      const imagePayload = images.map(({ url, thumbUrl, mediumUrl, claimToken }) => ({ url, thumbUrl, mediumUrl, claimToken }));

      if (isGuest) {
        // Guest posting — POST /listings/guest
        const body = {
          title:       title.trim(),
          description: description.trim(),
          categoryId:  parseInt(categoryId),
          cityId:      parseInt(cityId),
          attributes:  attrs,
          guestName:   guestName.trim(),
          turnstileToken,
          ...(guestPhone.trim() && { guestPhone: guestPhone.trim() }),
          ...(guestEmail.trim() && { guestEmail: guestEmail.trim() }),
          ...(subcategoryId && { subcategoryId: parseInt(subcategoryId) }),
          images: imagePayload,
        };

        const res = await fetch(`${API}/listings/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, requestId: requestIdFor(body) }),
        });
        const data = await res.json() as any;
        if (!res.ok) {
          setError(Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? 'Gabim gjatë ruajtjes'));
          setTurnstileToken('');
          turnstileRef.current?.reset();
          return;
        }
        clearDraft();
        setReceipt(String(data.id ?? data.reference ?? ''));
        setGuestSuccess(true);
      } else {
        // Authenticated posting
        const body: Record<string, unknown> = {
          title:       title.trim(),
          description: description.trim(),
          categoryId:  parseInt(categoryId),
          cityId:      parseInt(cityId),
          attributes: attrs,
          subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
          ...(isEditMode && ['DRAFT', 'REJECTED'].includes(editingStatus) && { status: 'PENDING_REVIEW' }),
          images: imagePayload,
        };

        const data = await adminFetch<{ id: string; slug: string; status: string }>(
          isEditMode ? `/listings/${editId}` : '/listings', undefined,
          { method: isEditMode ? 'PATCH' : 'POST', body: JSON.stringify(isEditMode ? body : { ...body, requestId: requestIdFor(body) }) },
        );
        clearDraft();
        markSaved();
        router.push(data.status === 'PUBLISHED'
          ? `/shpalljet/${data.slug ?? data.id}`
          : '/paneli/shpalljet?saved=1&status=' + encodeURIComponent(data.status));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nuk mund të lidhem me serverin');
    } finally {
      setSubmitting(false);
    }
  }

  if (dataError) return <div role="alert" className="p-8">{dataError} <button onClick={() => reloadData(n => n+1)}>Provo përsëri</button></div>;
  // Show guest success screen
  if (guestSuccess) {
    return <GuestSuccess listingTitle={title} reference={receipt} />;
  }

  if (isLoading || dataLoading || (user && isEditMode && editLoading)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (isEditMode && editError) {
    return <div className="max-w-3xl mx-auto px-4 py-10">
      <p role="alert" className="text-red-700">{editError}</p>
      <Link href="/paneli/shpalljet" className="mt-4 inline-block text-accent underline">Kthehu te shpalljet e mia</Link>
    </div>;
  }

  // Edit mode requires auth
  if (isEditMode && !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm text-gray-400 flex items-center gap-1.5 mb-3">
          <Link href="/" className="hover:text-accent transition-colors">Fillimi</Link>
          <span>›</span>
          {isEditMode && <><Link href="/paneli/shpalljet" className="hover:text-accent transition-colors">Shpalljet e Mia</Link><span>›</span></>}
          <span className="text-dark font-medium">{isEditMode ? 'Edito Shpalljen' : 'Posto Shpallje'}</span>
        </nav>
        <h1 className="text-2xl font-bold text-dark">{isEditMode ? 'Edito Shpalljen' : 'Posto Shpallje të Re'}</h1>
        {isEditMode && <p className="text-gray-500 text-sm mt-1">Ndryshimet ruhen dhe mund të dërgohen për shqyrtim.</p>}
      </div>

      {/* Guest info banner */}
      {isGuest && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-dark">Po postoni si vizitor</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Shpallja do të shkon në moderim. <Link href="/auth/hyr?redirect=/posto-shpallje" className="text-accent font-semibold hover:underline">Kyçu</Link> ose <Link href="/auth/regjistrohu?redirect=/posto-shpallje" className="text-accent font-semibold hover:underline">krijo llogari</Link> për të menaxhuar postimet tuaja.
            </p>
          </div>
        </div>
      )}

      {!isEditMode && <div className="text-sm p-3 bg-blue-50 rounded-lg mb-4"><p role="status">{draftNotice || 'Drafti ruhet vetëm në këtë skedë të shfletuesit.'}</p><button type="button" className="underline mt-2" onClick={discardDraft}>Hiq draftin dhe fillo përsëri</button></div>}
      {uploadNotice && <Feedback message={uploadNotice} type="success" />}
      <p className="text-sm text-gray-600 mb-4">Deri në {maxImages} foto. {requireImage ? 'Të paktën një foto është e detyrueshme.' : 'Fotot janë opsionale.'} Shpallja mund të kalojë në shqyrtim para publikimit.</p>
      <ValidatedForm onSubmit={handleSubmit} className="space-y-5">

        {/* Title */}
        <Field label={`Titulli *`} hint={`${title.length}/100`}>
          <input
            type="text" required maxLength={100}
            value={title} onChange={e => setTitle(e.currentTarget.value)}
            placeholder="p.sh. BMW Seria 3 2018, Apartament 2+1 Prishtinë…"
            className={inputCls}
          />
        </Field>

        {/* Category + Subcategory */}
        <div className={`grid gap-3 grid-cols-1 ${subcategories.length > 0 ? 'sm:grid-cols-2' : ''}`}>
          <Field label="Kategoria *">
            <select required value={categoryId}
              onChange={e => { setCategoryId(e.currentTarget.value); setSubcategoryId(''); setDynAttrs({}); }}
              className={selectCls}>
              <option value="">Zgjidh kategorinë</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {subcategories.length > 0 && (
            <Field label="Nënkategoria">
              <select value={subcategoryId} onChange={e => { setSubcategoryId(e.currentTarget.value); setDynAttrs({}); }}
                className={selectCls}>
                <option value="">Zgjidh nënkategorinë</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}
        </div>

        {/* Prompt to pick subcategory if needed */}
        {subcategories.length > 0 && !subcategoryId && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
            Zgjidh nënkategorinë për të vazhduar me detajet.
          </p>
        )}

        {/* Dynamic category-specific fields */}
        {activeSchema.length > 0 && (subcategories.length === 0 || subcategoryId) && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Detajet: {selectedSubcategory?.name ?? selectedCategory?.name ?? 'Kategorisë'}
            </p>
            <div className={`grid gap-3 grid-cols-2 sm:grid-cols-3`}>
              {activeSchema.map(field => (
                <Field key={field.name} label={`${field.label}${field.required ? ' *' : ''}`}>
                  {field.type === 'select' ? (
                    <select
                      value={dynAttrs[field.name] ?? ''}
                      onChange={e => { const v = e.currentTarget.value; setDynAttrs(prev => ({ ...prev, [field.name]: v })); }}
                      className={selectCls}
                    >
                      <option value="">— Zgjidh —</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={dynAttrs[field.name] ?? ''}
                      onChange={e => { const v = e.currentTarget.value; setDynAttrs(prev => ({ ...prev, [field.name]: v })); }}
                      placeholder={field.label}
                      className={inputCls}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        {/* City + Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Qyteti *">
            <select required value={cityId} onChange={e => setCityId(e.currentTarget.value)} className={selectCls}>
              <option value="">Zgjidh qytetin</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Çmimi (€)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">€</span>
              <input type="number" min={0} value={price} onChange={e => setPrice(e.currentTarget.value)}
                placeholder="0" className={`${inputCls} pl-7`} />
            </div>
          </Field>
        </div>

        {/* Phone numbers (multiple) — before description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Numrat e Telefonit *</label>
            {phones.length < 3 && (
              <button type="button" onClick={() => setPhones(prev => [...prev, ''])}
                className="text-xs font-semibold text-accent underline hover:no-underline">+ Shto numër</button>
            )}
          </div>
          <div className="space-y-2">
            {phones.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <input type="tel" aria-label={`Numri i telefonit ${idx+1}`} value={p}
                  required={idx === 0}
                  onChange={e => { const val = e.currentTarget.value; setPhones(prev => prev.map((v, i) => i === idx ? val : v)); }}
                  placeholder={idx === 0 ? '+383 44 123 456' : `Numër shtesë ${idx + 1}`}
                  className={`${inputCls} flex-1`} />
                {phones.length > 1 && (
                  <button type="button" onClick={() => setPhones(prev => prev.filter((_, i) => i !== idx))}
                    className="px-2 text-red-700 hover:text-red-700 text-lg font-bold shrink-0" title="Hiq numrin">×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <Field label="Përshkrimi *" hint={`${description.length}/2000`}>
          <textarea required minLength={20} maxLength={2000} rows={6}
            value={description} onChange={e => setDescription(e.currentTarget.value)}
            placeholder="Shkruaj një përshkrim të detajuar të shpalljes suaj…"
            className={`${inputCls} resize-none`} />
        </Field>

        {/* Images */}
        {/* Turnstile for guests */}
        {isGuest && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
            onError={() => { setTurnstileToken(''); setError('Verifikimi anti-bot dështoi. Provo sërish.'); }}
            options={{ theme: 'light', size: 'flexible' }}
          />
        )}

        <ImageUploader
          images={images}
          maxImages={maxImages}
          uploading={uploading}
          onFilesSelected={handleFilesSelected}
          onRemove={removeImage}
          onReorder={reorderImages}
        />

        {/* Negotiable price and promotion information */}
        {!isGuest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-dark text-sm">Promovimi i shpalljes</p>
            <p className="text-xs text-gray-500 mt-1">Për shfaqje me prioritet, <Link href="/kontakti" className="text-accent underline">kontaktoni ekipin tonë</Link>.</p>
          </div>
          <div className={`rounded-xl border-2 p-4 flex flex-col justify-between transition-all ${
            isNegotiable ? 'border-green-500 bg-green-50' : 'border-gray-200'
          }`}>
            <div>
              <p className="font-semibold text-dark text-sm">Negociueshëm</p>
              <p className="text-xs text-gray-500 mt-0.5">Çmimi i hapur për oferta</p>
            </div>
            <button type="button" role="switch" aria-checked={isNegotiable}
              onClick={() => setIsNegotiable(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-2 ${isNegotiable ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isNegotiable ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        )}

        {/* Guest identity section */}
        {isGuest && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Të dhënat tuaja</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Emri juaj">
                <input
                  type="text" maxLength={100}
                  value={guestName} onChange={e => setGuestName(e.currentTarget.value)}
                  placeholder="Emri dhe mbiemri"
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={guestEmail} onChange={e => setGuestEmail(e.currentTarget.value)}
                  placeholder="email@shembull.com"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-xs text-gray-400">
              Email-i juaj do të shfaqet publikisht në shpallje, që të interesuarit t’ju kontaktojnë.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Feedback message={error} type="error" />
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link href="/"
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold text-center hover:bg-gray-50 transition-colors">
            Anulo
          </Link>
          <button type="submit" disabled={submitting || uploading}
            className="flex-1 py-3 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-colors">
            {submitting
              ? (isEditMode ? 'Duke ruajtur…' : 'Duke publikuar…')
              : isEditMode
                ? '✓ Ruaj Ndryshimet'
                : isGuest
                  ? '→ Dërgo për Moderim'
                  : '+ Dërgo Shpalljen'}
          </button>
        </div>
      </ValidatedForm>
    </div>
  );
}

export default function PostoShpalljePage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    }>
      <PostoShpalljeContent />
    </Suspense>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white';
const selectCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white cursor-pointer';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <ConnectedField>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
    {children}
  </ConnectedField>;
}
