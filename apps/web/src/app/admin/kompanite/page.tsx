'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Toast from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';

import { uploadImages } from '@/lib/image-upload';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { imgSrc } from '@/lib/utils';

const API      = process.env.NEXT_PUBLIC_API_URL   ?? 'http://localhost:3001/api/v1';

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  description?: string | null;
  website?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  socials?: Record<string, string> | null;
  isVerified: boolean;
  isPremium: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  city?: { name: string } | null;
  _count: { listings: number; users: number };
}

interface UserResult {
  id: string;
  name: string;
  email: string;
}




function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── User search hook ─────────────────────────────────────────────────────────

function useUserSearch(token: string | null) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResults([]); setError(''); setLoading(false);
    if (!token || query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await adminFetch<{data: UserResult[]}>(`/admin/users?search=${encodeURIComponent(query)}&limit=8`, token);
        if (!Array.isArray(data.data)) throw new Error('Përgjigje e pavlefshme');
        if (active) setResults(data.data);
      } catch { if (active) setError('Kërkimi dështoi. Ndryshoni kërkimin për ta provuar përsëri.'); }
      finally { if (active) setLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, token]);
  return { query, setQuery, results, loading, error };
}

// ─── Image upload helpers ─────────────────────────────────────────────────────

function useImageUpload(type: 'logo' | 'cover') {
  const [preview, setPreview]   = useState<string | null>(null);
  const [path, setPath]         = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const data = await uploadImages<{ path: string }>(type === 'logo' ? 'company-logo' : 'company-cover', [file]);
      setPath(data.path);
    } catch {
      setPreview(null);
      setPath(null);
    } finally {
      setUploading(false);
    }
  }

  return { preview, path, uploading, handleFile };
}

// ─── Social icons ─────────────────────────────────────────────────────────────

const SOCIALS: { key: string; label: string; placeholder: string; icon: string }[] = [
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/...',  icon: 'f' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...', icon: '◎' },
  { key: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/...',  icon: 'in' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@...',   icon: '♪' },
  { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/...',   icon: '▶' },
  { key: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/...',      icon: '✕' },
];

// ─── Image picker component ───────────────────────────────────────────────────

function ImagePicker({
  label,
  aspect,
  preview,
  uploading,
  onChange,
}: {
  label: string;
  aspect: string;
  preview: string | null;
  uploading: boolean;
  onChange: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`relative flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors bg-gray-50 ${aspect}`}
      >
        {preview ? (
          <Image src={preview} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="text-center py-4">
            <p className="text-2xl text-gray-300">📷</p>
            <p className="text-xs text-gray-400 mt-1">Kliko për të ngarkuar</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
        />
      </div>
    </div>
  );
}

// ─── Add Company Modal ────────────────────────────────────────────────────────

function AddCompanyModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (c: Company) => void;
}) {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [form, setForm] = useState({ name: '', slug: '', phone: '', email: '', description: '', website: '', address: '' });
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [selectedOwner, setSelectedOwner] = useState<UserResult | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [showSocials, setShowSocials] = useState(false);
  const { query, setQuery, results, loading: searching, error: searchError } = useUserSearch(token);

  // Each upload receives a new destination from the API.
  const logo   = useImageUpload('logo');
  const cover  = useImageUpload('cover');

  function handleName(val: string) {
    setForm(f => ({ ...f, name: val, slug: f.slug === slugify(f.name) || f.slug === '' ? slugify(val) : f.slug }));
  }

  const { dirty, markSaved } = useUnsavedChanges({form, socials, selectedOwner, logo: logo.path, cover: cover.path});
  function closeEditor() { if (!dirty || confirm('Keni ndryshime të paruajtura. Të mbyllet pa ruajtur?')) onClose(); }
  async function submit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!selectedOwner) { setError('Zgjidhni pronarin e kompanisë'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        ownerId: selectedOwner.id,
        ...(logo.path  ? { logoUrl:  logo.path  } : {}),
        ...(cover.path ? { coverUrl: cover.path } : {}),
        ...(Object.keys(socials).length ? { socials } : {}),
      };
      const company = await adminFetch<Company>('/companies/admin-create', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      markSaved(); onCreated(company);
    } catch (err: any) {
      setError(err.message ?? 'Gabim gjatë krijimit');
    } finally {
      setSaving(false);
    }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <Modal label="Shto Kompani të Re" onClose={closeEditor} className="w-[min(32rem,calc(100%-2rem))]">
      {searchError && <p role="alert" className="text-red-800 text-sm p-3">{searchError}</p>}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-sm text-dark">Shto Kompani të Re</h2>
          <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <ValidatedForm onSubmit={submit} className="p-5 space-y-4">
          {error && <Feedback message={error} type="error" />}

          {/* Cover + Logo images */}
          <div className="space-y-3">
            <ImagePicker
              label="Banner / Cover"
              aspect="aspect-[3/1]"
              preview={cover.preview}
              uploading={cover.uploading}
              onChange={f => cover.handleFile(f)}
            />
            <div className="w-28">
              <ImagePicker
                label="Logo"
                aspect="aspect-square"
                preview={logo.preview}
                uploading={logo.uploading}
                onChange={f => logo.handleFile(f)}
              />
            </div>
          </div>

          {/* Owner search */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pronari <span className="text-red-700">*</span></label>
            {selectedOwner ? (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-dark">{selectedOwner.name}</p>
                  <p className="text-xs text-gray-400">{selectedOwner.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedOwner(null)} className="text-gray-400 hover:text-red-700 text-sm">×</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.currentTarget.value)}
                  placeholder="Kërko me emër ose email..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {searching && <p className="text-xs text-gray-400 px-3 py-2">Duke kërkuar...</p>}
                    {results.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedOwner(u); setQuery(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="text-xs font-medium text-dark">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Emri <span className="text-red-700">*</span></label>
            <input
              required minLength={2}
              value={form.name}
              onChange={e => handleName(e.currentTarget.value)}
              placeholder="Emri i kompanisë"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>

          {/* Slug */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Slug <span className="text-red-700">*</span></label>
            <input
              required minLength={2}
              value={form.slug}
              onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, slug: v })); }}
              placeholder="slug-i-kompanise"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </Field>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoni <span className="text-red-700">*</span></label>
              <input
                required
                value={form.phone}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, phone: v })); }}
                placeholder="+383 ..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-700">*</span></label>
              <input
                required type="email"
                value={form.email}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, email: v })); }}
                placeholder="info@kompania.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {/* Website & Address */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Faqja Web</label>
              <input
                type="url"
                value={form.website}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, website: v })); }}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adresa</label>
              <input
                value={form.address}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, address: v })); }}
                placeholder="Rruga, Qyteti..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {/* Description */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Përshkrim</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, description: v })); }}
              placeholder="Përshkrim i shkurtër..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </Field>

          {/* Social links */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSocials(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>Rrjetet Sociale</span>
              <span className={`text-gray-400 transition-transform ${showSocials ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showSocials && (
              <div className="border-t border-gray-100 p-4 space-y-2.5">
                {SOCIALS.map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-black text-gray-400 shrink-0">{s.icon}</span>
                    <input
                      type="url"
                      value={socials[s.key] ?? ''}
                      onChange={e => { const v = e.currentTarget.value; setSocials(prev => ({ ...prev, [s.key]: v })); }}
                      placeholder={s.placeholder}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={closeEditor} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800">
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || logo.uploading || cover.uploading}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Duke ruajtur...' : 'Krijo Kompanin'}
            </button>
          </div>
        </ValidatedForm>
      </div>
    </Modal>
  </ActionRegion>;
}

// ─── Assign User Modal ────────────────────────────────────────────────────────

function AssignUserModal({
  company,
  token,
  onClose,
  onAssigned,
}: {
  company: Company;
  token: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const { query, setQuery, results, loading: searching, error: searchError } = useUserSearch(token);

  async function submit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!selectedUser) { setError('Zgjidhni një përdorues'); return; }
    setSaving(true);
    setError('');
    try {
      await adminFetch(`/companies/${company.id}/assign-user`, token, {
        method: 'PATCH',
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      onAssigned();
    } catch (err: any) {
      setError(err.message ?? 'Gabim gjatë caktimit');
    } finally {
      setSaving(false);
    }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <Modal label="Cakto Përdorues" onClose={onClose} className="w-[min(32rem,calc(100%-2rem))]">
      {searchError && <p role="alert" className="text-red-800 text-sm p-3">{searchError}</p>}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-sm text-dark">Cakto Përdorues</h2>
            <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <ValidatedForm onSubmit={submit} className="p-5 space-y-4">
          {error && <Feedback message={error} type="error" />}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Përdoruesi <span className="text-red-700">*</span></label>
            {selectedUser ? (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-dark">{selectedUser.name}</p>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-700 text-sm">×</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.currentTarget.value)}
                  placeholder="Kërko me emër ose email..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {searching && <p className="text-xs text-gray-400 px-3 py-2">Duke kërkuar...</p>}
                    {results.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedUser(u); setQuery(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="text-xs font-medium text-dark">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Roli i përdoruesit do të ndryshohet në COMPANY.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800">
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Duke caktuar...' : 'Cakto'}
            </button>
          </div>
        </ValidatedForm>
      </div>
    </Modal>
  </ActionRegion>;
}

// ─── Edit Company Modal ──────────────────────────────────────────────────────

function EditCompanyModal({
  company,
  token,
  onClose,
  onUpdated,
}: {
  company: Company;
  token: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [form, setForm] = useState({
    name: company.name,
    slug: company.slug,
    phone: company.phone,
    email: company.email,
    description: company.description ?? '',
    website: company.website ?? '',
    address: company.address ?? '',
  });
  const [socials, setSocials] = useState<Record<string, string>>(company.socials ?? {});
  const [selectedOwner, setSelectedOwner] = useState<UserResult | null>(company.owner ?? null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [showSocials, setShowSocials] = useState(false);
  const { query: ownerQuery, setQuery: setOwnerQuery, results: ownerResults, loading: ownerSearching, error: ownerSearchError } = useUserSearch(token);

  const logo   = useImageUpload('logo');
  const cover  = useImageUpload('cover');

  const { dirty, markSaved } = useUnsavedChanges({form, socials, selectedOwner, logo: logo.path, cover: cover.path});
  function closeEditor() { if (!dirty || confirm('Keni ndryshime të paruajtura. Të mbyllet pa ruajtur?')) onClose(); }
  async function submit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (logo.path)  payload.logoUrl  = logo.path;
      if (cover.path) payload.coverUrl = cover.path;
      const filteredSocials = Object.fromEntries(Object.entries(socials).filter(([, v]) => v));
      if (Object.keys(filteredSocials).length) payload.socials = filteredSocials;
      if (selectedOwner && selectedOwner.id !== company.owner?.id) {
        payload.ownerId = selectedOwner.id;
      }
      await adminFetch(`/companies/${company.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      markSaved(); onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Gabim gjatë përditësimit');
    } finally {
      setSaving(false);
    }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <Modal label="Përditëso Kompanin" onClose={closeEditor} className="w-[min(32rem,calc(100%-2rem))]">
      {ownerSearchError && <p role="alert" className="text-red-800 text-sm p-3">{ownerSearchError}</p>}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-sm text-dark">Përditëso Kompanin</h2>
          <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <ValidatedForm onSubmit={submit} className="p-5 space-y-4">
          {error && <Feedback message={error} type="error" />}

          {/* Cover + Logo images */}
          <div className="space-y-3">
            <ImagePicker
              label="Banner / Cover"
              aspect="aspect-[3/1]"
              preview={cover.preview ?? (company.coverUrl ? imgSrc(company.coverUrl) : null)}
              uploading={cover.uploading}
              onChange={f => cover.handleFile(f)}
            />
            <div className="w-28">
              <ImagePicker
                label="Logo"
                aspect="aspect-square"
                preview={logo.preview ?? (company.logoUrl ? imgSrc(company.logoUrl) : null)}
                uploading={logo.uploading}
                onChange={f => logo.handleFile(f)}
              />
            </div>
          </div>

          {/* Owner (editable) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pronari <span className="text-red-700">*</span></label>
            {selectedOwner ? (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-dark">{selectedOwner.name}</p>
                  <p className="text-xs text-gray-400">{selectedOwner.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedOwner(null)} className="text-gray-400 hover:text-red-700 text-sm">×</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  aria-label="Kërko pronarin" type="text"
                  value={ownerQuery}
                  onChange={e => setOwnerQuery(e.currentTarget.value)}
                  placeholder="Kërko me emër ose email..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {(ownerResults.length > 0 || ownerSearching) && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {ownerSearching && <p className="text-xs text-gray-400 px-3 py-2">Duke kërkuar...</p>}
                    {ownerResults.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedOwner(u); setOwnerQuery(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="text-xs font-medium text-dark">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Emri <span className="text-red-700">*</span></label>
            <input
              required minLength={2}
              value={form.name}
              onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, name: v })); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>

          {/* Slug */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, slug: v })); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </Field>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoni <span className="text-red-700">*</span></label>
              <input
                required
                value={form.phone}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, phone: v })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-700">*</span></label>
              <input
                required type="email"
                value={form.email}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, email: v })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {/* Website & Address */}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Faqja Web</label>
              <input
                type="url"
                value={form.website}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, website: v })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adresa</label>
              <input
                value={form.address}
                onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, address: v })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>

          {/* Description */}
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Përshkrim</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, description: v })); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </Field>

          {/* Social links */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSocials(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>Rrjetet Sociale</span>
              <span className={`text-gray-400 transition-transform ${showSocials ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showSocials && (
              <div className="border-t border-gray-100 p-4 space-y-2.5">
                {SOCIALS.map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-black text-gray-400 shrink-0">{s.icon}</span>
                    <input
                      type="url"
                      value={socials[s.key] ?? ''}
                      onChange={e => { const v = e.currentTarget.value; setSocials(prev => ({ ...prev, [s.key]: v })); }}
                      placeholder={s.placeholder}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={closeEditor} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800">
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || logo.uploading || cover.uploading}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
            </button>
          </div>
        </ValidatedForm>
      </div>
    </Modal>
  </ActionRegion>;
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteCompanyModal({
  company,
  token,
  onClose,
  onDeleted,
}: {
  company: Company;
  token: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [deleting, setDeleting] = useState(false);
  const [error, setError]      = useState('');

  async function handleDelete() {
 return runAction(async () => {

    setDeleting(true);
    setError('');
    try {
      await adminFetch(`/companies/${company.id}`, token, { method: 'DELETE' });
      onDeleted();
    } catch (err: any) {
      setError(err.message ?? 'Gabim gjatë fshirjes');
    } finally {
      setDeleting(false);
    }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <Modal label="Fshi Kompanin" onClose={onClose} className="w-[min(32rem,calc(100%-2rem))]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-sm text-dark">Fshi Kompanin</h2>
        </div>
        <div className="p-5 space-y-4">
          {error && <Feedback message={error} type="error" />}
          <p className="text-xs text-gray-600">
            Jeni i sigurt që doni të fshini kompanin <strong>{company.name}</strong>? Kjo veprim nuk mund të kthehet mbrapa. Të gjithë përdoruesit e lidhur do të kthehen në rolin USER.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800">
              Anulo
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Duke fshirë...' : 'Fshi Kompanin'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </ActionRegion>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminKompanite() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [assignTarget, setAssignTarget] = useState<Company | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });

  }

  function loadCompanies() {
    if (!token) return;
    setLoading(true);
    setError('');
    adminFetch<{ data: Company[]; meta: { total: number } }>(`/companies?page=${page}&limit=25&q=${encodeURIComponent(search)}`, token)
      .then(data => { setCompanies(data.data); setTotal(data.meta.total); })
      .catch(() => setError('Kompanitë nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCompanies(); }, [token, page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleVerified(company: Company) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/companies/${company.id}/verify`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified: !company.isVerified }),
      });
      setCompanies((prev) =>
        prev.map((c) => c.id === company.id ? { ...c, isVerified: !company.isVerified } : c)
      );
      showToast(company.isVerified ? 'Verifikimi u hoq' : 'Kompania u verifikua');
    } catch {
      showToast('Gabim gjatë ndryshimit', 'error');
    }

 });
}

  async function togglePremium(company: Company) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/companies/${company.id}/premium`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isPremium: !company.isPremium }),
      });
      setCompanies((prev) =>
        prev.map((c) => c.id === company.id ? { ...c, isPremium: !company.isPremium } : c)
      );
      showToast(company.isPremium ? 'Premium u hoq' : 'Kompania u bë Premium');
    } catch {
      showToast('Gabim gjatë ndryshimit', 'error');
    }

 });
}

  const filtered = companies;

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}
      {error && <p role="alert">{error} <button onClick={loadCompanies}>Provo përsëri</button></p>}
      <nav aria-label="Faqet e kompanive" className="flex gap-4"><button disabled={page === 1} onClick={() => setPage(p => p-1)}>← Para</button><span>Faqja {page} / {Math.max(1, Math.ceil(total/25))}</span><button disabled={page*25 >= total} onClick={() => setPage(p => p+1)}>Tjetër →</button></nav>

      {showAdd && token && (
        <AddCompanyModal
          token={token}
          onClose={() => setShowAdd(false)}
          onCreated={(c) => {
            setShowAdd(false);
            showToast(`Kompania "${c.name}" u krijua me sukses`);
            loadCompanies();
          }}
        />
      )}

      {editTarget && token && (
        <EditCompanyModal
          company={editTarget}
          token={token}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            setEditTarget(null);
            showToast('Kompania u përditësua me sukses');
            loadCompanies();
          }}
        />
      )}

      {deleteTarget && token && (
        <DeleteCompanyModal
          company={deleteTarget}
          token={token}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            showToast('Kompania u fshi me sukses');
            loadCompanies();
          }}
        />
      )}

      {assignTarget && token && (
        <AssignUserModal
          company={assignTarget}
          token={token}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null);
            showToast('Përdoruesi u caktua me sukses');
            loadCompanies();
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-dark">Kompanite</h1>
          <p className="text-gray-400 text-xs mt-0.5">{total} gjithsej</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
              aria-label="Kërko kompani" placeholder="Kërko kompani..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
            />
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            Shto Kompani
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gjithsej', value: total, color: 'bg-gray-50 text-gray-700' },
          { label: 'Verifikuara', value: companies.filter((c) => c.isVerified).length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Premium', value: companies.filter((c) => c.isPremium).length, color: 'bg-amber-50 text-amber-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">🏢</p>
            <p className="text-sm text-gray-500 font-medium">
              {search ? 'Nuk u gjet asnjë kompani.' : 'Nuk ka kompani të regjistruara.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90"
              >
                + Shto Kompani të Re
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-175" data-responsive="cards">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Kompania</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden md:table-cell">Pronari</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Kontakti</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Shpallje</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Verifikuar</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Premium</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3" data-label="Kompania">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {company.logoUrl ? (
                            <Image
                              src={imgSrc(company.logoUrl)}
                              alt={company.name}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          ) : (
                            <span className="text-sm font-black text-primary">{company.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-dark text-xs">{company.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">/{company.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell" data-label="Pronari">
                      <p className="text-xs font-medium text-dark">{company.owner?.name}</p>
                      <p className="text-xs text-gray-400">{company.owner?.email}</p>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500" data-label="Kontakti">
                      <p>{company.phone}</p>
                      {company.city && <p className="text-xs text-gray-400 mt-0.5">{company.city.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Shpallje">
                      <span className="text-xs font-semibold text-gray-700">
                        {company._count?.listings ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Verifikuar">
                      <button
                        onClick={() => toggleVerified(company)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                          company.isVerified
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={company.isVerified ? 'Hiq verifikimin' : 'Verifiko'}
                      >
                        {company.isVerified ? '✓ Po' : '— Jo'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Premium">
                      <button
                        onClick={() => togglePremium(company)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                          company.isPremium
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={company.isPremium ? 'Hiq Premium' : 'Bëje Premium'}
                      >
                        {company.isPremium ? '⭐ Po' : '— Jo'}
                      </button>
                    </td>
                    <td className="px-4 py-3" data-label="Veprime">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => setEditTarget(company)}
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Përditëso"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Assign user */}
                        <button
                          onClick={() => setAssignTarget(company)}
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Cakto Përdorues"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </button>
                        {/* View profile */}
                        <Link
                          href={`/kompanite/${company.slug}`}
                          target="_blank"
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Shiko profilin"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(company)}
                          className="p-1 rounded text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Fshi"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </ActionRegion>;
}
