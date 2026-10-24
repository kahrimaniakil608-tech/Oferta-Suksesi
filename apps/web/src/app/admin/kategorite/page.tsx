'use client';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  position: number;
  isActive: boolean;
  parentId?: number | null;
  _count: { listings: number };
  children?: Category[];
}



type FormMode = 'create-top' | 'create-sub' | 'edit' | null;

export default function CategoriesPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [formMode,   setFormMode]   = useState<FormMode>(null);
  const [formParent, setFormParent] = useState<Category | null>(null);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [formName,   setFormName]   = useState('');
  const [formSlug,   setFormSlug]   = useState('');
  const [formIcon,   setFormIcon]   = useState('');
  const [formPos,    setFormPos]    = useState(0);
  const [formSaving, setFormSaving] = useState(false);

  // Delete modal
  const [delTarget,  setDelTarget]  = useState<Category | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  function load() {
    setLoading(true); setLoadError('');
    adminFetch<Category[]>('/admin/categories', token!)
      .then(d => setCategories(d))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }

  function openCreate(parent?: Category) {
    setFormMode(parent ? 'create-sub' : 'create-top');
    setFormParent(parent ?? null);
    setEditTarget(null);
    setFormName(''); setFormSlug(''); setFormIcon(''); setFormPos(0);
  }

  function openEdit(cat: Category) {
    setFormMode('edit');
    setEditTarget(cat);
    setFormParent(null);
    setFormName(cat.name); setFormSlug(cat.slug); setFormIcon(cat.icon ?? ''); setFormPos(cat.position);
  }

  function closeForm() { setFormMode(null); setEditTarget(null); setFormParent(null); }

  function autoSlug(name: string) {
    return name.toLowerCase()
      .replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/ä/g, 'a')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function saveForm() {
 return runAction(async () => {

    if (!token || !formName || !formSlug) { showToast('Plotëso emrin dhe slug-un', 'error'); return; }
    setFormSaving(true);
    try {
      if (formMode === 'edit' && editTarget) {
        await adminFetch(`/admin/categories/${editTarget.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ name: formName, slug: formSlug, icon: formIcon || undefined, position: formPos }),
        });
        showToast('Kategoria u ndryshua ✓');
      } else {
        await adminFetch('/admin/categories', token, {
          method: 'POST',
          body: JSON.stringify({ name: formName, slug: formSlug, icon: formIcon || undefined, position: formPos, parentId: formParent?.id }),
        });
        showToast('Kategoria u shtua ✓');
      }
      closeForm();
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    } finally {
      setFormSaving(false);
    }

 });
}

  async function toggleActive(cat: Category) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/categories/${cat.id}/toggle`, token, { method: 'POST' });
      load();
      showToast(`Kategoria u ${cat.isActive ? 'çaktivizua' : 'aktivizua'}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function deleteCategory(cat: Category) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/categories/${cat.id}`, token, { method: 'DELETE' });
      setDelTarget(null);
      load();
      showToast('Kategoria u fshi ✓');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-dark">Kategoritë</h1>
          <p className="text-gray-400 text-xs mt-0.5">{categories.length} kategori kryesore</p>
        </div>
        <button onClick={() => openCreate()}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Shto Kategori
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm text-gray-500">Nuk ka kategori.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Parent row */}
              <div className={`flex items-center gap-3 px-4 py-3 ${!cat.isActive ? 'opacity-50' : ''}`}>
                <span className="text-xl w-8 text-center">{cat.icon || '📂'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-dark text-sm">{cat.name}</p>
                    {!cat.isActive && <span className="text-xs font-bold px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full">Joaktive</span>}
                    <span className="text-xs text-gray-400 font-mono">/{cat.slug}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cat._count.listings} shpallje · {cat.children?.length ?? 0} nënkategori · Pozita {cat.position}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openCreate(cat)}
                    className="px-2 py-1 text-xs font-semibold border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
                    + Nënkategori
                  </button>
                  <button onClick={() => openEdit(cat)}
                    className="px-2 py-1 text-xs font-semibold border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
                    ✏️ Ndrysho
                  </button>
                  <button onClick={() => toggleActive(cat)}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${cat.isActive ? 'border border-amber-200 text-amber-800 hover:bg-amber-50' : 'border border-green-200 text-green-700 hover:bg-green-50'}`} aria-pressed={cat.isActive}>
                    {cat.isActive ? 'Çaktivizo' : 'Aktivo'}
                  </button>
                  <button onClick={() => setDelTarget(cat)}
                    className="px-2 py-1 text-xs font-semibold border border-red-100 rounded-md text-red-700 hover:bg-red-50 transition-colors">
                    🗑 Fshi
                  </button>
                </div>
              </div>

              {/* Children */}
              {cat.children && cat.children.length > 0 && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {cat.children.map(sub => (
                    <div key={sub.id} className={`flex items-center gap-3 px-4 py-2.5 bg-gray-50/50 ${!sub.isActive ? 'opacity-50' : ''}`}>
                      <span className="text-sm w-8 text-center ml-4">{sub.icon || '└'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-gray-700">{sub.name}</p>
                          {!sub.isActive && <span className="text-xs font-bold px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full">Joaktive</span>}
                          <span className="text-xs text-gray-400 font-mono">/{sub.slug}</span>
                        </div>
                        <p className="text-xs text-gray-400">{sub._count.listings} shpallje</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(sub)}
                          className="px-1.5 py-0.5 text-xs font-semibold border border-gray-200 rounded text-gray-500 hover:bg-gray-100">✏️</button>
                        <button onClick={() => toggleActive(sub)}
                          className={`px-1.5 py-0.5 text-xs font-semibold rounded border transition-colors ${sub.isActive ? 'border-amber-200 text-amber-800 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`} aria-pressed={sub.isActive}>
                          {sub.isActive ? 'Çaktivizo' : 'Aktivo'}
                        </button>
                        <button onClick={() => setDelTarget(sub)}
                          className="px-1.5 py-0.5 text-xs font-semibold border border-red-100 rounded text-red-700 hover:bg-red-50">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {formMode && (
        <Modal label="" onClose={closeForm} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark">
                {formMode === 'edit' ? `Ndrysho: ${editTarget?.name}` :
                 formMode === 'create-sub' ? `Nënkategori e re → ${formParent?.name}` :
                 'Kategori e re'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <div className="space-y-3">
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Emri <span className="text-red-700">*</span></label>
                <input type="text" value={formName}
                  onChange={e => { setFormName(e.currentTarget.value); if (!formMode || formMode !== 'edit') setFormSlug(autoSlug(e.currentTarget.value)); }}
                  placeholder="p.sh. Patunësi"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Slug <span className="text-red-700">*</span></label>
                <input type="text" value={formSlug} onChange={e => setFormSlug(e.currentTarget.value)} placeholder="patunesi"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ikona (emoji)</label>
                  <input type="text" value={formIcon} onChange={e => setFormIcon(e.currentTarget.value)} placeholder="🏠"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg text-center focus:outline-none focus:border-primary" />
                </Field>
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pozita (renditja)</label>
                  <input type="number" min={0} value={formPos} onChange={e => setFormPos(Number(e.currentTarget.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </Field>
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <span className="text-2xl">{formIcon || '📂'}</span>
                <div>
                  <p className="text-sm font-semibold text-dark">{formName || 'Emri i kategorisë'}</p>
                  <p className="text-xs text-gray-400 font-mono">/{formSlug || 'slug'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={closeForm} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={saveForm} disabled={formSaving}
                className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {formSaving ? 'Duke ruajtur…' : formMode === 'edit' ? 'Ruaj Ndryshimet' : 'Shto Kategori'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {delTarget && (
        <Modal label="Fshi" onClose={() => setDelTarget(null)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <span className="text-3xl">{delTarget.icon || '📂'}</span>
            <h3 className="text-sm font-bold text-dark mt-2 mb-1">Fshi &ldquo;{delTarget.name}&rdquo;</h3>
            <p className="text-xs text-gray-500 mb-1">
              {delTarget._count.listings > 0
                ? `⚠️ Kjo kategori ka ${delTarget._count.listings} shpallje. Nuk mund të fshihet.`
                : 'Ky veprim është i pakthyeshëm.'}
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDelTarget(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={() => deleteCategory(delTarget)} disabled={delTarget._count.listings > 0}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Fshi
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
