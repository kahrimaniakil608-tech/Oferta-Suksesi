'use client';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

interface City {
  id: number;
  name: string;
  slug: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  _count?: { listings: number; companies: number };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}



const EMPTY_FORM = { name: '', slug: '', region: '', latitude: '', longitude: '' };

export default function AdminQytetet() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();

  const [cities,   setCities]   = useState<City[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [delModal, setDelModal] = useState<City | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });

  }

  function load() {
    if (!token) return;
    setLoading(true); setLoadError('');
    adminFetch<City[]>('/admin/cities', token)
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, revision]);

  function startEdit(city: City) {
    setEditId(city.id);
    setForm({
      name:      city.name,
      slug:      city.slug,
      region:    city.region ?? '',
      latitude:  city.latitude != null ? String(city.latitude) : '',
      longitude: city.longitude != null ? String(city.longitude) : '',
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
 return runAction(async () => {

    if (!token || !form.name.trim()) return;
    setSaving(true);
    const body = {
      name:      form.name.trim(),
      slug:      form.slug.trim() || slugify(form.name.trim()),
      region:    form.region.trim() || undefined,
      latitude:  form.latitude  ? parseFloat(form.latitude)  : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
    };

    try {
      if (editId !== null) {
        const updated = await adminFetch<City>(`/admin/cities/${editId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setCities((prev) => prev.map((c) => c.id === editId ? { ...c, ...updated } : c));
        showToast('Qyteti u përditësua');
      } else {
        const created = await adminFetch<City>('/admin/cities', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Qyteti u shtua');
      }
      cancelEdit();
    } catch (err: any) {
      showToast(err?.message ?? 'Gabim gjatë ruajtjes', 'error');
    } finally {
      setSaving(false);
    }

 });
}

  async function handleDelete(city: City) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/cities/${city.id}`, token, { method: 'DELETE' });
      setCities((prev) => prev.filter((c) => c.id !== city.id));
      setDelModal(null);
      showToast('Qyteti u fshi');
    } catch (err: any) {
      setDelModal(null);
      showToast(err?.message ?? 'Gabim gjatë fshirjes', 'error');
    }

 });
}

  const filtered = search
    ? cities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.region?.toLowerCase().includes(search.toLowerCase()),
      )
    : cities;

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-dark">Qytetet</h1>
          <p className="text-gray-400 text-xs mt-0.5">{cities.length} gjithsej</p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            aria-label="Kërko qytet" placeholder="Kërko qytet..."
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
          />
          <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Add / Edit form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-xs font-bold text-dark mb-3">
          {editId !== null ? 'Ndrysho Qytetin' : 'Shto Qytet të Ri'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field>
            <label className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Emri *</label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.currentTarget.value;
                setForm((f) => ({ ...f, name, slug: editId !== null ? f.slug : slugify(name) }));
              }}
              placeholder="p.sh. Prishtinë"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field>
            <label className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, slug: v })); }}
              placeholder="prishtine"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </Field>
          <Field>
            <label className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Rajoni</label>
            <input
              value={form.region}
              onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, region: v })); }}
              placeholder="p.sh. Kosovë Qendrore"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Field className="flex-1">
              <label className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Lat</label>
              <input
                value={form.latitude}
                onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, latitude: v })); }}
                placeholder="42.6629"
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field className="flex-1">
              <label className="block text-xs text-gray-500 font-semibold mb-1 uppercase">Lon</label>
              <input
                value={form.longitude}
                onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, longitude: v })); }}
                placeholder="21.1655"
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Duke ruajtur...' : editId !== null ? 'Ruaj Ndryshimet' : '+ Shto Qytetin'}
          </button>
          {editId !== null && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulo
            </button>
          )}
        </div>
      </div>

      {/* Cities table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-2xl mb-2">🏙️</p>
            <p className="text-sm">{search ? 'Nuk u gjet asnjë qytet.' : 'Nuk ka qytete. Shto të parin!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]" data-responsive="cards">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Qyteti</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden md:table-cell">Rajoni</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase hidden lg:table-cell">Koordinatat</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Shpallje</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((city) => (
                  <tr key={city.id} className={`hover:bg-gray-50 transition-colors ${editId === city.id ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3" data-label="Qyteti">
                      <p className="font-semibold text-dark text-xs">{city.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{city.slug}</p>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-500" data-label="Rajoni">
                      {city.region ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-400 font-mono" data-label="Koordinatat">
                      {city.latitude != null && city.longitude != null
                        ? `${city.latitude}, ${city.longitude}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Shpallje">
                      <span className="text-xs font-semibold text-gray-700">
                        {city._count?.listings ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3" data-label="Veprime">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(city)}
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Ndrysho"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDelModal(city)}
                          className="p-1 rounded text-red-700 hover:bg-red-50 transition-colors"
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

      {/* Delete confirmation modal */}
      {delModal && (
        <Modal label="Fshi Qytetin" onClose={() => setDelModal(null)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <span className="text-3xl">🏙️</span>
            <h3 className="text-sm font-bold text-dark mt-2 mb-1">Fshi Qytetin</h3>
            <p className="text-xs text-gray-500 mb-1">
              A je i sigurt që dëshiron të fshish <strong>{delModal.name}</strong>?
            </p>
            {(delModal._count?.listings ?? 0) > 0 && (
              <p className="text-xs text-red-700 font-semibold mb-3">
                Ky qytet ka {delModal._count!.listings} shpallje — nuk mund të fshihet.
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDelModal(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50"
              >
                Anulo
              </button>
              <button
                onClick={() => handleDelete(delModal)}
                disabled={(delModal._count?.listings ?? 0) > 0}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Fshi
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
