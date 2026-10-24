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

interface Badge {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  isAutomatic: boolean;
  criteria?: string;
  _count?: { users: number };
}

interface BadgeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}



const PRESET_COLORS = ['#1B5E3B', '#E8793B', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#EC4899'];
const PRESET_ICONS  = ['⭐', '🏆', '🔥', '💎', '🛡️', '✅', '🎯', '🌟', '👑', '🦁', '🚀', '💡'];

export default function BadgesPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const [badges,  setBadges]  = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Users modal
  const [usersModal,  setUsersModal]  = useState<Badge | null>(null);
  const [badgeUsers,  setBadgeUsers]  = useState<BadgeUser[]>([]);
  const [usersLoading,setUsersLoading]= useState(false);

  const [usersError, setUsersError] = useState('');
  const [searchError, setSearchError] = useState('');

  // Create/Edit modal
  const [formModal,    setFormModal]    = useState<Badge | 'new' | null>(null);
  const [formName,     setFormName]     = useState('');
  const [formLabel,    setFormLabel]    = useState('');
  const [formIcon,     setFormIcon]     = useState('⭐');
  const [formColor,    setFormColor]    = useState('#1B5E3B');
  const [formDesc,     setFormDesc]     = useState('');
  const [formAuto,     setFormAuto]     = useState(false);
  const [formCriteria, setFormCriteria] = useState('');
  const [formSaving,   setFormSaving]   = useState(false);

  // Delete modal
  const [delModal, setDelModal] = useState<Badge | null>(null);

  // Assign user to badge
  const [userSearch,       setUserSearch]       = useState('');
  const [searchResults,    setSearchResults]    = useState<BadgeUser[]>([]);
  const [searching,        setSearching]        = useState(false);
  const [searchTimer,      setSearchTimer]      = useState<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true); setLoadError('');
    adminFetch<{ data: Badge[] }>('/admin/badges', token)
      .then(r => setBadges(r.data ?? []))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, revision]);

  function openCreate() {
    setFormModal('new');
    setFormName(''); setFormLabel(''); setFormIcon('⭐'); setFormColor('#1B5E3B');
    setFormDesc(''); setFormAuto(false); setFormCriteria('');
  }

  function openEdit(b: Badge) {
    setFormModal(b);
    setFormName(b.name); setFormLabel(b.label); setFormIcon(b.icon); setFormColor(b.color);
    setFormDesc(b.description ?? ''); setFormAuto(b.isAutomatic); setFormCriteria(b.criteria ?? '');
  }

  async function openUsers(b: Badge) {
    setUsersModal(b);
    setBadgeUsers([]);
    setUsersLoading(true); setUsersError('');
    adminFetch<{ data: BadgeUser[] }>(`/admin/badges/${b.id}/users`, token!)
      .then(r => setBadgeUsers(r.data ?? []))
      .catch(() => setUsersError('Përdoruesit e etiketës nuk u ngarkuan.'))
      .finally(() => setUsersLoading(false));
  }

  function handleUserSearch(query: string) {
    setUserSearch(query); setSearchError('');
    if (searchTimer) clearTimeout(searchTimer);
    if (query.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      if (!token) return;
      setSearching(true);
      try {
        const res = await adminFetch<{ data: { id: string; name: string; email: string; avatarUrl?: string }[] }>(
          `/admin/users?search=${encodeURIComponent(query)}&limit=8`, token
        );
        setSearchResults(res.data ?? []);
      } catch {
        setSearchResults([]); setSearchError('Kërkimi dështoi. Ndryshoni kërkimin për ta provuar përsëri.');
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(timer);
  }

  async function assignUserBadge(badge: Badge, userId: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${userId}/badges`, token, {
        method: 'POST',
        body: JSON.stringify({ badgeSlug: badge.name }),
      });
      // Refresh badge users list
      const r = await adminFetch<{ data: BadgeUser[] }>(`/admin/badges/${badge.id}/users`, token);
      setBadgeUsers(r.data ?? []);
      setBadges(prev => prev.map(b => b.id === badge.id && b._count ? { ...b, _count: { users: (b._count.users) + 1 } } : b));
      setUserSearch('');
      setSearchResults([]);
      showToast('Etiketë u caktua');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function removeUserBadge(badgeId: string, userId: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/badges/${badgeId}/users/${userId}`, token, { method: 'DELETE' });
    setBadgeUsers(prev => prev.filter(u => u.id !== userId));
    setBadges(prev => prev.map(b => b.id === badgeId && b._count ? { ...b, _count: { users: b._count.users - 1 } } : b));
    showToast('Etiketë u hoq');

 });
}

  async function saveForm() {
 return runAction(async () => {

    if (!token || !formName || !formLabel) { showToast('Plotëso emrin dhe etiketa', 'error'); return; }
    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName, label: formLabel, icon: formIcon, color: formColor,
        description: formDesc, isAutomatic: formAuto,
      };
      if (formAuto && formCriteria) body.criteria = JSON.parse(formCriteria);

      if (formModal === 'new') {
        const created = await adminFetch<Badge>('/admin/badges', token, { method: 'POST', body: JSON.stringify(body) });
        setBadges(prev => [created, ...prev]);
        showToast('Etiketë u krijua ✓');
      } else if (formModal && typeof formModal === 'object') {
        await adminFetch(`/admin/badges/${formModal.id}`, token, { method: 'PATCH', body: JSON.stringify(body) });
        setBadges(prev => prev.map(b => b.id === (formModal as Badge).id ? { ...b, ...body, id: b.id, _count: b._count } : b));
        showToast('Etiketë u ndryshua ✓');
      }
      setFormModal(null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    } finally {
      setFormSaving(false);
    }

 });
}

  async function deleteBadge(b: Badge) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/badges/${b.id}`, token, { method: 'DELETE' });
    setBadges(prev => prev.filter(x => x.id !== b.id));
    setDelModal(null);
    showToast('Etiketë u fshi');

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-dark">Etiketat</h1>
          <p className="text-gray-400 text-xs mt-0.5">{badges.length} badge gjithsej</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Shto Etiketë
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-white rounded-xl animate-pulse border border-gray-100" />)}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-sm text-gray-500 font-medium">Nuk ka badge.</p>
          <button onClick={openCreate} className="mt-3 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark">
            + Shto Etiketë
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {badges.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 shadow-sm"
                style={{ backgroundColor: b.color + '20' }}>
                {b.icon}
              </div>
              <p className="font-semibold text-dark text-sm">{b.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{b.name}</p>
              {b.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{b.description}</p>}

              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${b.isAutomatic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {b.isAutomatic ? 'Automatik' : 'Manual'}
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: b.color + '20', color: b.color }}>
                  {b._count?.users ?? 0} përdorues
                </span>
              </div>

              <div className="flex gap-1.5 mt-3 w-full">
                <button onClick={() => openUsers(b)}
                  className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  Përdoruesit
                </button>
                <button onClick={() => openEdit(b)}
                  className="py-1.5 px-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  ✏️
                </button>
                <button onClick={() => setDelModal(b)}
                  className="py-1.5 px-2 text-xs font-semibold border border-red-100 rounded-lg text-red-700 hover:bg-red-50 transition-colors">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users modal */}
      {usersModal && (
        <Modal label="Dritarja e administrimit" onClose={() => { setUsersModal(null); setUserSearch(''); setSearchResults([]); }} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{usersModal.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-dark">{usersModal.label}</h3>
                <p className="text-xs text-gray-400">{badgeUsers.length} përdorues</p>
              </div>
              <button onClick={() => { setUsersModal(null); setUserSearch(''); setSearchResults([]); }} className="ml-auto text-gray-400 hover:text-gray-600 text-lg">x</button>
            </div>

            {searchError && <LoadFeedback type="error" message={searchError} retry={() => handleUserSearch(userSearch)} />}
            {/* Search to assign */}
            <div className="mb-3 relative">
              <input
                type="text"
                value={userSearch}
                onChange={e => handleUserSearch(e.currentTarget.value)}
                placeholder="Kërko përdorues për të caktuar..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              {(searching || searchResults.length > 0) && userSearch.length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searching ? (
                    <div className="p-3 text-center text-xs text-gray-400">Duke kërkuar...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">Asnjë rezultat.</div>
                  ) : searchResults.map(u => {
                    const alreadyHas = badgeUsers.some(bu => bu.id === u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-dark truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        {alreadyHas ? (
                          <span className="text-xs font-bold text-green-700 px-2 py-0.5 bg-green-50 rounded-full shrink-0">Caktuar</span>
                        ) : (
                          <button onClick={() => assignUserBadge(usersModal, u.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary-dark shrink-0">
                            Cakto
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {usersError ? <LoadFeedback type="error" message={usersError} retry={() => openUsers(usersModal)} /> : usersLoading ? (
                [1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)
              ) : badgeUsers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Asnjë përdorues me këtë etiketë.</p>
              ) : badgeUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-dark truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <button onClick={() => removeUserBadge(usersModal.id, u.id)}
                    className="px-2 py-0.5 text-xs font-bold border border-red-100 text-red-700 rounded hover:bg-red-50 shrink-0">
                    Hiq
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Create/Edit modal */}
      {formModal !== null && (
        <Modal label="Dritarja e administrimit" onClose={() => setFormModal(null)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark">{formModal === 'new' ? 'Shto Etiketë të Ri' : 'Ndrysho Etiketë'}</h3>
              <button onClick={() => setFormModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Emri (sistem)</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.currentTarget.value)} placeholder="verified_user"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </Field>
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Etiketa (publike)</label>
                  <input type="text" value={formLabel} onChange={e => setFormLabel(e.currentTarget.value)} placeholder="Përdorues i Verifikuar"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </Field>
              </div>

              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Përshkrimi</label>
                <input type="text" value={formDesc} onChange={e => setFormDesc(e.currentTarget.value)} placeholder="Ky badge tregohet kur…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>

              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Ikona</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(ic => (
                    <button key={ic} aria-label={`Ikona ${ic}`} aria-pressed={formIcon === ic} type="button" onClick={() => setFormIcon(ic)}
                      className={`w-9 h-9 text-lg rounded-lg border-2 transition-colors ${formIcon === ic ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
                <input type="text" value={formIcon} onChange={e => setFormIcon(e.currentTarget.value)} placeholder="ose shkruaj emoji"
                  className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary" />
              </Field>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Ngjyra</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} aria-label={`Ngjyra ${c}`} aria-pressed={formColor === c} type="button" onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${formColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input aria-label="Zgjidh ngjyrën e etiketës" type="color" value={formColor} onChange={e => setFormColor(e.currentTarget.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                  <input aria-label="Kodi i ngjyrës së etiketës" type="text" value={formColor} onChange={e => setFormColor(e.currentTarget.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary font-mono" />
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: formColor }} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="automatic-badge" className="text-xs font-semibold text-gray-600">Automatik</label>
                <button id="automatic-badge" type="button" role="switch" aria-label="Etiketë automatike" aria-checked={formAuto} onClick={() => setFormAuto(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${formAuto ? 'bg-primary' : 'bg-gray-200'}`}>
                  <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formAuto ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {formAuto && (
                <Field>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kriteret (JSON)</label>
                  <textarea value={formCriteria} onChange={e => setFormCriteria(e.currentTarget.value)} rows={3} placeholder='{"minListings": 10}'
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none" />
                </Field>
              )}
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: formColor + '20' }}>{formIcon}</div>
              <div>
                <p className="text-xs font-semibold text-dark">{formLabel || 'Etiketa'}</p>
                <p className="text-xs text-gray-400">{formName || 'emri'}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setFormModal(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={saveForm} disabled={formSaving} className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50">
                {formSaving ? 'Duke ruajtur…' : formModal === 'new' ? 'Shto Etiketë' : 'Ruaj'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {delModal && (
        <Modal label="Fshi Etiketë" onClose={() => setDelModal(null)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <span className="text-3xl">{delModal.icon}</span>
            <h3 className="text-sm font-bold text-dark mt-2 mb-1">Fshi Etiketë &ldquo;{delModal.label}&rdquo;</h3>
            <p className="text-xs text-gray-500 mb-4">Etiketë do të hiqet nga të gjithë {delModal._count?.users ?? 0} përdoruesit.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelModal(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={() => deleteBadge(delModal)} className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">Fshi</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
