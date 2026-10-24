'use client';
import { statusLabel } from '@/lib/labels';
import { useAction } from '@/hooks/useAction';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import Toast from '@/components/ui/Feedback';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { timeAgo } from '@/lib/utils';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  trustScore: number;
  isVerified: boolean;
  suspendedAt?: string | null;
  suspendedUntil?: string | null;
  deletedAt?: string | null;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  totalListings?: number;
  _count?: { listings: number };
  badges?: Badge[];
  listings?: UserListing[];
}

interface Badge {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
}

interface UserBadgeEntry {
  id: string;
  assignedAt: string;
  expiresAt?: string;
  badge: Badge;
  assignedBy?: { id: string; name: string };
}

interface AllBadge {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
}

interface UserListing {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  category?: { name: string };
  city?: { name: string };
}

interface ModerationLog {
  id: string;
  action: string;
  reason?: string;
  createdAt: string;
  moderator?: { name: string };
  listing?: { title: string };
}

const ROLE_BADGE: Record<string, string> = {
  USER: 'bg-gray-100 text-gray-700', MODERATOR: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700', COMPANY: 'bg-teal-100 text-teal-700',
};
const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700', PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700', ARCHIVED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-orange-100 text-orange-800', DRAFT: 'bg-blue-100 text-blue-700',
};
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publikuar', PENDING_REVIEW: 'Pritje', REJECTED: 'Refuzuar',
  ARCHIVED: 'Arkivuar', EXPIRED: 'Skaduar', DRAFT: 'Draft',
};

type Tab = 'shpalljet' | 'moderimi' | 'aktiviteti';



export default function UserDetailPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token, user: me } = useAuth();
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;

  const [user,    setUser]    = useState<UserDetail | null>(null);
  const [modLogs, setModLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('shpalljet');
  const [toast,   setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editName,       setEditName]       = useState('');
  const [editEmail,      setEditEmail]      = useState('');
  const [editPhone,      setEditPhone]      = useState('');
  const [editRole,       setEditRole]       = useState('');
  const [editTrustScore, setEditTrustScore] = useState(0);
  const [editVerified,   setEditVerified]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const { dirty, markSaved } = useUnsavedChanges(
    { editName, editEmail, editPhone, editRole, editTrustScore, editVerified },
    !loading && !loadError,
  );

  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuspendModal,  setShowSuspendModal]  = useState(false);
  const [showDeleteModal,   setShowDeleteModal]   = useState(false);
  const [newPassword,       setNewPassword]       = useState('');
  const [confirmPassword,   setConfirmPassword]   = useState('');
  const [suspendReason,     setSuspendReason]     = useState('');
  const [suspendDuration,   setSuspendDuration]   = useState('30');

  // Badge assign state
  const [showBadgeModal, setShowBadgeModal]   = useState(false);
  const [allBadges,      setAllBadges]        = useState<AllBadge[]>([]);
  const [badgesLoading,  setBadgesLoading]    = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });

  };

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true); setLoadError('');
    Promise.all([
      adminFetch<UserDetail>(`/admin/users/${id}`, token),
      adminFetch<{ data: ModerationLog[] }>(`/admin/users/${id}/moderation-logs`, token),
    ]).then(([u, logs]) => {
      if (!u?.id || typeof u.name !== "string" || typeof u.email !== "string" || !Array.isArray(logs.data)) throw new Error("Përdoruesi nuk u ngarkua plotësisht. Provoni përsëri.");
      setUser(u);
      setModLogs(logs.data);
      setEditName(u.name);
      setEditEmail(u.email);
      setEditPhone(u.phone ?? '');
      setEditRole(u.role);
      setEditTrustScore(u.trustScore);
      setEditVerified(u.isVerified);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.')).finally(() => setLoading(false));
  }, [token, id, revision]);

  async function saveUser() {
 return runAction(async () => {

    if (!token) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/users/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, role: editRole, trustScore: editTrustScore, isVerified: editVerified }),
      });
      setUser(prev => prev ? { ...prev, name: editName, email: editEmail, phone: editPhone, role: editRole, trustScore: editTrustScore, isVerified: editVerified } : prev);
      markSaved();
      showToast('Ndryshimet u ruajtën');
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : 'Gabim'), 'error');
    } finally {
      setSaving(false);
    }

 });
}

  async function resetPassword() {
 return runAction(async () => {

    if (!token || newPassword !== confirmPassword) { showToast('Fjalëkalimet nuk përputhen', 'error'); return; }
    try {
      await adminFetch(`/admin/users/${id}/password`, token, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      });
      showToast('Fjalëkalimi u ndryshua');
      setShowPasswordModal(false);
      setNewPassword(''); setConfirmPassword('');
    } catch {
      showToast('Gabim gjatë ndryshimit', 'error');
    }

 });
}

  async function suspendUser() {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${id}/suspend`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: suspendReason, duration: parseInt(suspendDuration) }),
      });
      showToast('Përdoruesi u pezullua');
      setShowSuspendModal(false);
      setUser(await adminFetch<UserDetail>(`/admin/users/${id}`, token));
    } catch {
      showToast('Gabim gjatë pezullimit', 'error');
    }

 });
}

  async function recover(action: 'restore' | 'unsuspend') {
 return runAction(async () => {

    try {
      await adminFetch(`/admin/users/${id}/${action}`, token!, { method: 'POST' });
      setUser(await adminFetch<UserDetail>(`/admin/users/${id}`, token!));
      showToast('Llogaria u rikthye. Shpalljet mbeten të arkivuara deri në shqyrtim.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Gabim', 'error'); }

 });
}

  async function deleteUser() {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${id}`, token, { method: 'DELETE' });
      showToast('Përdoruesi u fshi');
      setTimeout(() => router.push('/admin/perdoruesit'), 1200);
    } catch {
      showToast('Gabim gjatë fshirjes', 'error');
    }

 });
}

  async function openBadgeModal() {
    setShowBadgeModal(true);
    setBadgesLoading(true);
    try {
      const res = await adminFetch<{ data: AllBadge[] }>('/admin/badges', token!);
      setAllBadges(res.data ?? []);
    } catch {
      setAllBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  }

  async function assignBadge(badgeName: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${id}/badges`, token, {
        method: 'POST',
        body: JSON.stringify({ badgeSlug: badgeName }),
      });
      // Refetch user to get updated badges
      const u = await adminFetch<UserDetail>(`/admin/users/${id}`, token);
      setUser(u);
      showToast('Etiketë u caktua');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function removeBadge(badgeName: string) {
 return runAction(async () => {

    if (!token) return;
    try {
      await adminFetch(`/admin/users/${id}/badges/${badgeName}`, token, { method: 'DELETE' });
      setUser(prev => prev ? {
        ...prev,
        badges: prev.badges?.filter((ub: any) => (ub.badge?.name ?? ub.name) !== badgeName),
      } : prev);
      showToast('Etiketë u hoq');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    }

 });
}

  async function approveListing(listingId: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/listings/${listingId}/approve`, token, { method: 'POST' });
    setUser(prev => prev ? {
      ...prev,
      listings: prev.listings?.map(l => l.id === listingId ? { ...l, status: 'PUBLISHED' } : l),
    } : prev);

 });
}

  async function rejectListing(listingId: string) {
 return runAction(async () => {

    if (!token) return;
    await adminFetch(`/admin/listings/${listingId}/reject`, token, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Refuzuar nga admini' }),
    });
    setUser(prev => prev ? {
      ...prev,
      listings: prev.listings?.map(l => l.id === listingId ? { ...l, status: 'REJECTED' } : l),
    } : prev);

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12 text-gray-400">Përdoruesi nuk u gjet.</div>;
  }

  return <ActionRegion busy={actionBusy} error={actionError}>
    {dirty && <p role="status" className="mb-3 text-sm text-amber-800">Keni ndryshime të paruajtura në profilin e përdoruesit.</p>}
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      {/* Back */}
      <Link href="/admin/perdoruesit" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
        ← Kthehu te lista
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-dark">{user.name}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? 'bg-gray-100'}`}>{statusLabel(user.role)}</span>
              {user.isVerified && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verifikuar</span>}
              {(user.suspendedAt && (!user.suspendedUntil || new Date(user.suspendedUntil) > new Date())) && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Pezulluar</span>}
            </div>
            <p className="text-xs text-gray-500">{user.email}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
              <span>Anëtar që nga {timeAgo(user.createdAt)}</span>
              {user.lastLoginAt && <span>Hyrja e fundit: {timeAgo(user.lastLoginAt)}</span>}
              <span>{user._count?.listings ?? 0} shpallje</span>
              <span className="flex items-center gap-1">
                Pikët e besueshmërisë:
                <span className={`font-bold ${user.trustScore < 20 ? 'text-red-700' : user.trustScore < 40 ? 'text-amber-800' : 'text-green-700'}`}>
                  {user.trustScore}
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => setShowPasswordModal(true)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Ndrysho Fjalëkalimin
            </button>
            {user.suspendedAt && <button onClick={() => recover('unsuspend')} className="border rounded px-3 py-2 text-xs">Hiq pezullimin</button>}
            {user.deletedAt && <button onClick={() => recover('restore')} className="border rounded px-3 py-2 text-xs">Rikthe llogarinë</button>}
            {user.suspendedUntil && <span className="text-xs">Deri më {new Date(user.suspendedUntil).toLocaleString()}</span>}
            <button disabled={!!user.suspendedAt || !!user.deletedAt} onClick={() => setShowSuspendModal(true)} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors">
              Pezullo
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors">
              Fshi
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Etiketat</p>
            <button onClick={openBadgeModal} className="text-xs font-semibold text-primary hover:underline">
              + Shto Etiketë
            </button>
          </div>
          {user.badges && user.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.badges.map((ub: any) => {
                const b = ub.badge ?? ub;
                const badgeName = ub.badge?.name ?? ub.name;
                return (
                  <span key={ub.id ?? b.id} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full group" style={{ backgroundColor: b.color + '20', color: b.color }}>
                    {b.icon} {b.label}
                    <button onClick={() => removeBadge(badgeName)} className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-700 transition-opacity text-xs font-bold" title="Hiq badge">
                      x
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Asnje badge.</p>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-dark mb-4">Ndrysho të Dhënat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Emri', value: editName, setter: setEditName, type: 'text' },
            { label: 'Email', value: editEmail, setter: setEditEmail, type: 'email' },
            { label: 'Telefoni', value: editPhone, setter: setEditPhone, type: 'tel' },
            { label: 'Pikët e besueshmërisë', value: String(editTrustScore), setter: (v: string) => setEditTrustScore(Number(v)), type: 'number' },
          ].map(({ label, value, setter, type }) => (
            <Field key={label}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={e => setter(e.currentTarget.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary"
              />
            </Field>
          ))}
          <Field>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Roli</label>
            <select value={editRole} onChange={e => setEditRole(e.currentTarget.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary">
              {['USER','MODERATOR','ADMIN','COMPANY'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-3 pt-5">
            <label className="text-xs font-semibold text-gray-600">I Verifikuar</label>
            <button
              role="switch" aria-label="Përdorues i verifikuar" aria-checked={editVerified} onClick={() => setEditVerified(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${editVerified ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveUser} disabled={saving}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {saving ? 'Duke ruajtur…' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {([
            { key: 'shpalljet', label: `Shpalljet (${user.totalListings ?? user._count?.listings ?? 0})` },
            { key: 'moderimi',  label: `Historiku i Moderimit (${modLogs.length})` },
            { key: 'aktiviteti', label: 'Aktiviteti' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-xs font-semibold transition-colors ${tab === t.key ? 'text-primary border-b-2 border-primary bg-primary/3' : 'text-gray-500 hover:text-gray-700'}`} aria-pressed={tab === t.key}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'shpalljet' && (
            user.listings && user.listings.length > 0 ? (
              <table className="w-full text-sm" data-responsive="cards">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-2 font-semibold">Titulli</th>
                    <th className="pb-2 font-semibold hidden sm:table-cell">Kategoria</th>
                    <th className="pb-2 font-semibold">Statusi</th>
                    <th className="pb-2 font-semibold text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {user.listings.map(l => (
                    <tr key={l.id}>
                      <td className="py-2.5" data-label="Titulli">
                        <p className="text-xs font-medium text-dark truncate max-w-[200px]">{l.title}</p>
                        <p className="text-xs text-gray-400">{timeAgo(l.createdAt)}</p>
                      </td>
                      <td className="py-2.5 hidden sm:table-cell text-xs text-gray-500" data-label="Kategoria">{l.category?.name}</td>
                      <td className="py-2.5" data-label="Statusi">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right" data-label="Veprime">
                        {l.status === 'PENDING_REVIEW' && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => approveListing(l.id)} className="px-2 py-0.5 bg-green-700 text-white text-xs font-bold rounded hover:bg-green-700">Aprovo</button>
                            <button onClick={() => rejectListing(l.id)}  className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded hover:bg-red-100">Refuzo</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-400 text-sm py-6">Nuk ka shpallje.</p>
            )
          )}

          {tab === 'moderimi' && (
            modLogs.length > 0 ? (
              <div className="space-y-2">
                {modLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">M</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-dark">{log.action}</p>
                      {log.listing && <p className="text-xs text-gray-500">Shpallja: {log.listing.title}</p>}
                      {log.reason && <p className="text-xs text-gray-500">Arsyeja: {log.reason}</p>}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{timeAgo(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-6">Nuk ka histori moderimi.</p>
            )
          )}

          {tab === 'aktiviteti' && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-xs font-semibold text-dark">Regjistruar</p>
                  <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleString('sq-AL')}</p>
                </div>
              </div>
              {user.lastLoginAt && (
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <span className="text-lg">🔑</span>
                  <div>
                    <p className="text-xs font-semibold text-dark">Hyrja e Fundit</p>
                    <p className="text-xs text-gray-500">{new Date(user.lastLoginAt).toLocaleString('sq-AL')}</p>
                  </div>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-xs font-semibold text-dark">Shpallje Gjithsej</p>
                  <p className="text-xs text-gray-500">{user._count?.listings ?? 0} shpallje</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <Modal label="Ndrysho Fjalëkalimin" onClose={() => setShowPasswordModal(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-dark mb-4">Ndrysho Fjalëkalimin</h3>
            <div className="space-y-3">
              <input type="password" placeholder="Fjalëkalim i ri" value={newPassword} onChange={e => setNewPassword(e.currentTarget.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              <input type="password" placeholder="Konfirmo fjalëkalimin" value={confirmPassword} onChange={e => setConfirmPassword(e.currentTarget.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={resetPassword} className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark">Ndrysho</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend modal */}
      {showSuspendModal && (
        <Modal label="Pezullo Përdoruesin" onClose={() => setShowSuspendModal(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-dark mb-4">Pezullo Përdoruesin</h3>
            <div className="space-y-3">
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Arsyeja</label>
                <textarea value={suspendReason} onChange={e => setSuspendReason(e.currentTarget.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kohëzgjatja</label>
                <select value={suspendDuration} onChange={e => setSuspendDuration(e.currentTarget.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="7">7 ditë</option>
                  <option value="30">30 ditë</option>
                  <option value="90">90 ditë</option>
                  <option value="0">Përgjithmonë</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowSuspendModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={suspendUser} className="flex-1 py-2 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-600">Pezullo</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Badge assign modal */}
      {showBadgeModal && (
        <Modal label="Cakto Etiketë" onClose={() => setShowBadgeModal(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark">Cakto Etiketë</h3>
              <button onClick={() => setShowBadgeModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {badgesLoading ? (
                [1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)
              ) : allBadges.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Nuk ka badge te krijuara.</p>
              ) : allBadges.map(b => {
                const alreadyAssigned = user?.badges?.some((ub: any) => (ub.badge?.name ?? ub.name) === b.name);
                return (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: b.color + '20' }}>
                      {b.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-dark">{b.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{b.name}</p>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs font-bold text-green-700 px-2 py-0.5 bg-green-50 rounded-full shrink-0">Caktuar</span>
                    ) : (
                      <button onClick={() => assignBadge(b.name)} className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary-dark shrink-0">
                        Cakto
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <Modal label="Fshi Përdoruesin" onClose={() => setShowDeleteModal(false)} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="text-center mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-sm font-bold text-dark mt-2">Fshi Përdoruesin</h3>
              <p className="text-xs text-gray-500 mt-1">Ky veprim është i pakthyeshëm. Të gjitha shpalljet dhe të dhënat e {user.name} do të fshihen.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">Anulo</button>
              <button onClick={deleteUser} className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">Fshi Përgjithmonë</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
