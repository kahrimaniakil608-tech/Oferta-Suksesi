'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { statusLabel } from '@/lib/labels';
import { timeAgo } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  trustScore: number;
  isVerified?: boolean;
  isSuspended?: boolean;
  _count: { listings: number };
  badges?: { id: string; name: string; icon: string; color: string }[];
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  USER:      'bg-gray-100 text-gray-600',
  MODERATOR: 'bg-blue-100 text-blue-700',
  ADMIN:     'bg-purple-100 text-purple-700',
  COMPANY:   'bg-teal-100 text-teal-700',
};

const ROLES = ['Të gjitha', 'ADMIN', 'MODERATOR', 'COMPANY', 'USER'];



function UsersContent() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token, user: me } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const page   = parseInt(sp.get('page') ?? '1');
  const search = sp.get('search') ?? '';
  const role   = sp.get('role') ?? '';
  const deleted = sp.get('deleted') === 'true';

  const [users,    setUsers]    = useState<User[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast,    setToast]    = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchInput, setSearchInput] = useState(search);

  // Create user modal
  const [showCreate,      setShowCreate]      = useState(false);
  const [createName,      setCreateName]      = useState('');
  const [createEmail,     setCreateEmail]     = useState('');
  const [createPhone,     setCreatePhone]     = useState('');
  const [createPassword,  setCreatePassword]  = useState('');
  const [createRole,      setCreateRole]      = useState('USER');
  const [createVerified,  setCreateVerified]  = useState(false);
  const [creating,        setCreating]        = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });

  };

  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => { setSelected(new Set()); }, [page, search, role, deleted]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true); setLoadError('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (role)   params.set('role', role);
    if (deleted) params.set('deleted', 'true');
    adminFetch<{ data: User[]; meta: { total: number; totalPages: number } }>(
      `/admin/users?${params}`, token,
    ).then((r) => {
      if (!active) return;
      if (!Array.isArray(r.data) || !r.meta || !Number.isFinite(r.meta.total) || !Number.isFinite(r.meta.totalPages)) throw new Error("Lista nuk u ngarkua plotësisht. Provoni përsëri.");
      setUsers(r.data);
      setTotal(r.meta.total);
      setPages(r.meta.totalPages);
      if (page > Math.max(1, r.meta.totalPages)) navPage(Math.max(1, r.meta.totalPages));
    }).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.')).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, page, search, role, deleted, revision]);

  function navWith(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function navPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navWith({ search: searchInput });
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => users.every(u => prev.has(u.id)) ? new Set() : new Set(users.map(u => u.id)));
  }

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(30);
  async function bulkSuspend() {
 return runAction(async () => {

    if (!token || !selected.size || !suspendReason.trim()) return;
    const ids = users.filter(u => selected.has(u.id)).map(u => u.id);
    const results = await Promise.allSettled(ids.map(id =>
      adminFetch(`/admin/users/${id}/suspend`, token, { method: 'POST', body: JSON.stringify({ reason: suspendReason.trim(), duration: suspendDays }) })
    ));
    const failed = ids.filter((_, i) => results[i].status === 'rejected');
    setSelected(new Set(failed));
    setSuspendOpen(false);
    showToast(`${ids.length - failed.length} u pezulluan; ${failed.length} dështuan.${failed.length ? ' Përzgjedhja përmban vetëm dështimet për riprovim.' : ''}`, failed.length ? 'error' : 'success');
    setRevision(n => n + 1);

 });
}

  async function deleteUser(id: string) {
 return runAction(async () => {

    if (!token || !confirm('Je i sigurt qe deshiron te fshish kete perdorues?')) return;
    try {
      await adminFetch(`/admin/users/${id}`, token, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('Përdoruesi u fshi'); setRevision(n => n + 1);
    } catch {
      showToast('Gabim gjate fshirjes', 'error');
    }

 });
}

  async function changeRole(id: string, newRole: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      showToast('Roli u ndryshua'); setRevision(n => n + 1);
    } catch {
      showToast('Gabim gjatë ndryshimit', 'error');
    }

 });
}

  async function createUser() {
 return runAction(async () => {

    if (!token || !createName || !createEmail || !createPassword) return;
    setCreating(true);
    try {
      await adminFetch('/admin/users', token, {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          phone: createPhone || undefined,
          password: createPassword,
          role: createRole,
          isVerified: createVerified,
        }),
      });
      showToast('Përdoruesi u krijua me sukses');
      setShowCreate(false);
      setCreateName(''); setCreateEmail(''); setCreatePhone('');
      setCreatePassword(''); setCreateRole('USER'); setCreateVerified(false);
      setRevision(n => n + 1);
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : 'Gabim gjatë krijimit'), 'error');
    } finally {
      setCreating(false);
    }

 });
}

  const trustColor = (score: number) =>
    score < 20 ? 'text-red-700' : score < 40 ? 'text-amber-800' : 'text-green-700';

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}
      {suspendOpen && <Modal label="Pezullo përdoruesit e zgjedhur" onClose={() => setSuspendOpen(false)} className="w-[min(32rem,calc(100%-2rem))] p-5 bg-white rounded-xl">
        <h2 className="font-bold">Pezullo {selected.size} përdorues</h2>
        <p className="my-3 text-sm">Këto llogari humbin qasjen dhe mundësinë e publikimit për kohëzgjatjen e zgjedhur. Arsyeja regjistrohet për secilin përdorues.</p>
        <p className="text-sm mb-3">{users.filter(u => selected.has(u.id)).map(u => u.name).join(', ')}</p>
        <Field><label>Arsyeja e pezullimit</label><textarea className="w-full border rounded p-2" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} required /></Field>
        <Field><label>Kohëzgjatja në ditë</label><input type="number" min="1" max="365" className="border rounded p-2" value={suspendDays} onChange={e => setSuspendDays(Number(e.target.value))} /></Field>
        <div className="flex gap-3 mt-4"><button onClick={() => setSuspendOpen(false)}>Anulo</button><button className="bg-primary text-white p-2 rounded" disabled={!suspendReason.trim() || suspendDays < 1 || suspendDays > 365} onClick={bulkSuspend}>Konfirmo pezullimin</button></div>
      </Modal>}


      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-dark">Përdoruesit</h1>
          <p className="text-gray-400 text-xs mt-0.5">{total} gjithsej</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-500">{selected.size} zgjedhur</span>
              <button onClick={() => setSuspendOpen(true)} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                Pezullo
              </button>
            </>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Shto Përdorues
          </button>
        </div>
      </div>

      {/* Filters */}
      <Field className="flex flex-wrap gap-2">
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={deleted} onChange={e => navWith({ deleted: e.target.checked ? 'true' : '' })} />Shfaq llogaritë e fshira</label>
        <ValidatedForm onSubmit={handleSearch} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            aria-label="Kërko emër ose email" placeholder="Kërko emër, email…"
            value={searchInput}
            onChange={e => setSearchInput(e.currentTarget.value)}
            className="text-xs text-gray-600 placeholder-gray-400 outline-none w-44 bg-transparent"
          />
        </ValidatedForm>
        <select aria-label="Filtro sipas rolit"
          value={role}
          onChange={e => navWith({ role: e.currentTarget.value })}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary"
        >
          {ROLES.map(r => (
            <option key={r} value={r === 'Të gjitha' ? '' : r}>{statusLabel(r)}</option>
          ))}
        </select>
      </Field>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nuk ka përdorues.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]" data-responsive="cards">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th scope="col" aria-label="Përzgjedhja" className="px-4 py-3 w-8">
                      <input aria-label="Zgjidh të gjithë përdoruesit e kësaj faqeje" type="checkbox" checked={selected.size === users.length && users.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary/20" />
                    </th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Emri / Email</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Roli</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Pikët e besueshmërisë</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Shpallje</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Regjistruar</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${selected.has(u.id) ? 'bg-primary/3' : ''}`}>
                      <td className="px-4 py-3" data-label="Përzgjedhja">
                        <input aria-label={`Zgjidh ${u.name}`} type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/20" />
                      </td>
                      <td className="px-3 py-3" data-label="Emri / Email">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-dark text-xs truncate">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3" data-label="Roli">
                        {me?.role === 'ADMIN' ? (
                          <select aria-label={`Roli për ${u.name}`}
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.currentTarget.value)}
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            <option value="USER">Përdorues</option>
                            <option value="MODERATOR">Moderator</option>
                            <option value="ADMIN">Administrator</option>
                            <option value="COMPANY">Kompani</option>
                          </select>
                        ) : (
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabel(u.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3" data-label="Pikët e besueshmërisë">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(u.trustScore, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${trustColor(u.trustScore)}`}>{u.trustScore}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500" data-label="Shpallje">{u._count.listings}</td>
                      <td className="px-3 py-3 text-xs text-gray-400" data-label="Regjistruar">{timeAgo(u.createdAt)}</td>
                      <td className="px-4 py-3" data-label="Veprime">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/perdoruesit/${u.id}`}
                            className="px-2.5 py-1 border border-primary/30 text-primary text-xs font-semibold rounded-md hover:bg-primary/5 transition-colors"
                          >
                            Edito →
                          </Link>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="p-1 rounded text-red-700 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Fshi"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Faqja {page} nga {pages} · {total} gjithsej</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => navPage(page - 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    ← Prapa
                  </button>
                  <button disabled={page >= pages} onClick={() => navPage(page + 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Para →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Create user modal */}
      {showCreate && (
        <Modal label="Shto Përdorues të Ri" onClose={() => setShowCreate(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-sm font-bold text-dark mb-4">Shto Përdorues të Ri</h3>
            <div className="space-y-3">
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Emri <span className="text-red-700">*</span></label>
                <input type="text" value={createName} onChange={e => setCreateName(e.currentTarget.value)}
                  placeholder="Emri i plotë"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email <span className="text-red-700">*</span></label>
                <input type="email" value={createEmail} onChange={e => setCreateEmail(e.currentTarget.value)}
                  placeholder="email@shembull.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Telefoni</label>
                <input type="tel" value={createPhone} onChange={e => setCreatePhone(e.currentTarget.value)}
                  placeholder="+383 44 000 000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fjalëkalimi <span className="text-red-700">*</span></label>
                <input type="password" value={createPassword} onChange={e => setCreatePassword(e.currentTarget.value)}
                  placeholder="Min. 8 karaktere"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Roli</label>
                <select value={createRole} onChange={e => setCreateRole(e.currentTarget.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="USER">Përdorues</option>
                  <option value="COMPANY">Kompani</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button
                  role="switch" aria-label="Llogaria e verifikuar" aria-checked={createVerified} onClick={() => setCreateVerified(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${createVerified ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${createVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <label className="text-xs text-gray-600 font-semibold cursor-pointer" onClick={() => setCreateVerified(v => !v)}>
                  Llogaria e verifikuar
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                Anulo
              </button>
              <button
                onClick={createUser}
                disabled={creating || !createName || !createEmail || createPassword.length < 8}
                className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {creating ? 'Duke krijuar…' : 'Krijo Llogarinë'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse bg-white rounded-xl" />}>
      <UsersContent />
    </Suspense>
  );
}
