'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

type AdPlacement = 'HEADER_SLIDER' | 'SIDEBAR' | 'FOOTER' | 'INLINE' | 'COMPANY_SPOTLIGHT' | 'SEARCH_TOP';

interface AdZone {
  id: string;
  name: string;
  slug: string;
  placement: AdPlacement;
  width: number;
  height: number;
  maxAds: number;
  rotationInterval: number;
  description?: string | null;
  _count?: { advertisements: number };
  activeAds?: number;
}

const PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: 'HEADER_SLIDER',     label: 'Header Slider'      },
  { value: 'SIDEBAR',           label: 'Sidebar'            },
  { value: 'FOOTER',            label: 'Footer'             },
  { value: 'INLINE',            label: 'Inline'             },
  { value: 'COMPANY_SPOTLIGHT', label: 'Company Spotlight'  },
  { value: 'SEARCH_TOP',        label: 'Search Top'         },
];

const PLACEMENT_BADGE: Record<AdPlacement, string> = {
  HEADER_SLIDER:     'bg-purple-100 text-purple-700',
  SIDEBAR:           'bg-blue-100 text-blue-700',
  FOOTER:            'bg-gray-100 text-gray-600',
  INLINE:            'bg-green-100 text-green-700',
  COMPANY_SPOTLIGHT: 'bg-amber-100 text-amber-700',
  SEARCH_TOP:        'bg-cyan-100 text-cyan-700',
};

const EMPTY_FORM = { name: '', slug: '', placement: 'SIDEBAR' as AdPlacement, width: 300, height: 250, maxAds: 1, rotationInterval: 5, description: '' };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}



export default function ZonatPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [zones, setZones]     = useState<AdZone[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [search, setSearch]   = useState('');
  const [toast, setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });

  }

  async function load() {
    if (!token) return;
    setLoading(true); setLoadError('');
    try {
      const data = await adminFetch<AdZone[]>('/admin/ad-zones', token);
      setZones(data);
    } catch {
      setLoadError('Zonat nuk u ngarkuan. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function startEdit(zone: AdZone) {
    setEditId(zone.id);
    setForm({
      name:        zone.name,
      slug:        zone.slug,
      placement:   zone.placement,
      width:       zone.width,
      height:      zone.height,
      maxAds:      zone.maxAds,
      rotationInterval: zone.rotationInterval ?? 5,
      description: zone.description ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        name:        form.name.trim(),
        slug:        form.slug.trim(),
        placement:   form.placement,
        width:       Number(form.width),
        height:      Number(form.height),
        maxAds:           Number(form.maxAds),
        rotationInterval: Number(form.rotationInterval),
        description:      form.description?.trim() || undefined,
      };
      if (editId) {
        await adminFetch(`/admin/ad-zones/${editId}`, token, { method: 'PATCH', body: JSON.stringify(body) });
        showToast('Zona u përditësua me sukses', 'success');
      } else {
        await adminFetch('/admin/ad-zones', token, { method: 'POST', body: JSON.stringify(body) });
        showToast('Zona u krijua me sukses', 'success');
      }
      cancelEdit();
      load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gabim i panjohur', 'error');
    } finally {
      setSaving(false);
    }

 });
}

  async function handleDelete(zone: AdZone) {
 return runAction(async () => {

    if (!token) return;
    const activeCount = zone.activeAds ?? zone._count?.advertisements ?? 0;
    if (activeCount > 0) {
      showToast(`Nuk mund të fshihet — ka ${activeCount} reklamë aktive`, 'error');
      return;
    }
    if (!confirm(`Fshi zonën "${zone.name}"?`)) return;
    setDeleting(zone.id);
    try {
      await adminFetch(`/admin/ad-zones/${zone.id}`, token, { method: 'DELETE' });
      showToast('Zona u fshi', 'success');
      load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gabim gjatë fshirjes', 'error');
    } finally {
      setDeleting(null);
    }

 });
}

  const filtered = zones.filter(z =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.slug.toLowerCase().includes(search.toLowerCase())
  );

  const isEditing = editId !== null;
  const formTitle = isEditing ? 'Ndrysho Zonën' : 'Shto Zonë të Re';

  if (loadError) return <Toast message={loadError} type="error" retry={load} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Zonat e Reklamave</h1>
          <p className="text-sm text-gray-500 mt-0.5">{zones.length} zona gjithsej</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => { setEditId(''); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Shto Zonë
          </button>
        )}
      </div>

      {/* Form */}
      {(isEditing || editId === '') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{formTitle}</h2>
          <ValidatedForm onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emri <span className="text-red-700">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({
                    ...f,
                    name: e.currentTarget.value,
                    slug: isEditing ? f.slug : slugify(e.currentTarget.value),
                  }))}
                  placeholder="p.sh. Homepage Leaderboard"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug <span className="text-red-700">*</span></label>
                <input
                  required
                  value={form.slug}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, slug: value })); }}
                  placeholder="homepage-leaderboard"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendosja <span className="text-red-700">*</span></label>
                <select
                  value={form.placement}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, placement: value as AdPlacement })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {PLACEMENTS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gjerësia (px) <span className="text-red-700">*</span></label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.width}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, width: Number(value) })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lartësia (px) <span className="text-red-700">*</span></label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.height}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, height: Number(value) })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maks. Reklama <span className="text-red-700">*</span></label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.maxAds}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, maxAds: Number(value) })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rotacioni (sek.)</label>
                <input
                  type="number"
                  min={1}
                  value={form.rotationInterval}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, rotationInterval: Number(value) })); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Përshkrimi</label>
                <input
                  value={form.description}
                  onChange={e => { const value = e.currentTarget.value; setForm(f => ({ ...f, description: value })); }}
                  placeholder="Përshkrim opsional i zonës"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            </div>

            {/* Preview */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className="bg-gray-200 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 shrink-0"
                style={{ width: Math.min(form.width, 160), height: Math.min(form.height, 80) }}
              >
                {form.width}×{form.height}
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium text-gray-700">{form.name || 'Emri i zonës'}</p>
                <p className="font-mono text-xs">{form.slug || 'slug-i-zones'}</p>
                <p>Maks. {form.maxAds} reklamë · {PLACEMENTS.find(p => p.value === form.placement)?.label}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60 transition-colors"
              >
                {saving ? 'Duke ruajtur…' : isEditing ? 'Ruaj Ndryshimet' : '+ Shto Zonën'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anulo
              </button>
            </div>
          </ValidatedForm>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            aria-label="Kërko zona reklame" placeholder="Kërko zona..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-sm font-medium">Nuk ka zona. Shto të parën!</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-responsive="cards">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Emri / Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendosja</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dimensionet</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kapaciteti</th>
                <th className="px-4 py-3">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(zone => {
                const total  = zone._count?.advertisements ?? 0;
                const active = zone.activeAds ?? 0;
                const pct    = zone.maxAds > 0 ? Math.min((total / zone.maxAds) * 100, 100) : 0;
                return (
                  <tr key={zone.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3" data-label="Emri / Slug">
                      <p className="font-medium text-gray-800">{zone.name}</p>
                      <p className="text-xs font-mono text-gray-400">{zone.slug}</p>
                      {zone.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{zone.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3" data-label="Vendosja">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLACEMENT_BADGE[zone.placement]}`}>
                        {PLACEMENTS.find(p => p.value === zone.placement)?.label ?? zone.placement}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Dimensionet">
                      <span className="text-xs font-mono text-gray-600">{zone.width}×{zone.height}</span>
                    </td>
                    <td className="px-4 py-3" data-label="Kapaciteti">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-600">
                          {active > 0 ? `${active} aktive · ` : ''}{total}/{zone.maxAds}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" data-label="Përzgjedhja">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(zone)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Ndrysho"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(zone)}
                          disabled={deleting === zone.id}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          title="Fshi"
                        >
                          {deleting === zone.id ? (
                            <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </ActionRegion>;
}
