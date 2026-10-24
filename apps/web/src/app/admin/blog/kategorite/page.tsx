'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  _count?: { posts: number };
}

function deriveSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/ä/g, 'a')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function AdminBlogCategoriesPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Create form
  const [name,        setName]        = useState('');
  const [slug,        setSlug]        = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [showForm,    setShowForm]    = useState(false);

  // Edit state
  const [editId,          setEditId]          = useState<number | null>(null);
  const [editName,        setEditName]        = useState('');
  const [editSlug,        setEditSlug]        = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving,      setEditSaving]      = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setLoadError('');
    adminFetch<BlogCategory[]>('/blog/categories', token)
      .then(setCategories).catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, revision]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === deriveSlug(name)) {
      setSlug(deriveSlug(value));
    }
  }

  async function handleCreate(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token || !name.trim() || !slug.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await adminFetch<BlogCategory>('/blog/categories', token, {
        method: 'POST',
        body: JSON.stringify({ name, slug, description: description || undefined }),
      });
      setCategories(prev => [...prev, created]);
      setName(''); setSlug(''); setDescription('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.');
    } finally {
      setSaving(false);
    }

 });
}

  function startEdit(cat: BlogCategory) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDescription(cat.description ?? '');
  }

  async function handleUpdate(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token || !editId) return;
    setEditSaving(true);
    try {
      const updated = await adminFetch<BlogCategory>(`/blog/categories/${editId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, slug: editSlug, description: editDescription || undefined }),
      });
      setCategories(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setEditId(null);
    } catch {
      // keep editing
    } finally {
      setEditSaving(false);
    }

 });
}

  async function handleDelete(id: number) {
 return runAction(async () => {

    if (!token || !window.confirm('Jeni i sigurt? Artikujt e kësaj kategorie nuk do fshihen.')) return;
    await adminFetch(`/blog/categories/${id}`, token, { method: 'DELETE' });
    setCategories(prev => prev.filter(c => c.id !== id));

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/blog" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Blog
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-dark">Kategoritë e Blogut</h1>
      </div>

      {/* Create form toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Kategori e Re
        </button>
      ) : (
        <ValidatedForm onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-dark">Kategori e Re</h2>

          {error && (
            <Feedback message={error} type="error" />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <label className="block text-sm font-semibold text-dark mb-1.5">Emri *</label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.currentTarget.value)}
                placeholder="p.sh. Karriera"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                required
              />
            </Field>
            <Field>
              <label className="block text-sm font-semibold text-dark mb-1.5">
                Slug *
                <span className="ml-1 text-xs text-gray-400 font-normal">/blog?category={slug || '…'}</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="karriera"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                required
              />
            </Field>
          </div>

          <Field>
            <label className="block text-sm font-semibold text-dark mb-1.5">Përshkrimi</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.currentTarget.value)}
              placeholder="opsionale"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Duke ruajtur…' : 'Ruaj Kategorinë'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulo
            </button>
          </div>
        </ValidatedForm>
      )}

      {/* Categories list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">Nuk ka kategori ende. Shto kategorinë e parë!</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-responsive="cards">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Emri</th>
                <th className="hidden md:table-cell text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Slug</th>
                <th className="hidden md:table-cell text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Artikuj</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  {editId === cat.id ? (
                    <td colSpan={4} className="px-4 py-3">
                      <ValidatedForm onSubmit={handleUpdate} className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.currentTarget.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-36"
                          required
                        />
                        <input
                          value={editSlug}
                          onChange={e => setEditSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-36"
                          required
                        />
                        <input
                          value={editDescription}
                          onChange={e => setEditDescription(e.currentTarget.value)}
                          placeholder="Përshkrimi"
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition flex-1"
                        />
                        <button
                          type="submit"
                          disabled={editSaving}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {editSaving ? '…' : 'Ruaj'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Anulo
                        </button>
                      </ValidatedForm>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-semibold text-dark text-sm">{cat.name}</td>
                      <td className="hidden md:table-cell px-3 py-3 text-xs text-gray-400 font-mono">{cat.slug}</td>
                      <td className="hidden md:table-cell px-3 py-3 text-xs text-gray-500">
                        {cat._count?.posts ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(cat)}
                            className="px-2 py-1 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-dark transition-colors"
                          >
                            Edito
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md hover:bg-red-100 transition-colors"
                          >
                            Fshij
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </ActionRegion>;
}
