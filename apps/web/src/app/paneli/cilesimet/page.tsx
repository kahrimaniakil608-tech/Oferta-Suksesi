'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import Feedback from '@/components/ui/Feedback';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Field from '@/components/ui/Field';
import { authFetch } from '@/lib/session';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/admin-api';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const NOTIF_PREFS = [
  { key: 'listing_approved',  label: 'Shpallja u aprovua' },
  { key: 'listing_rejected',  label: 'Shpallja u refuzua' },
  { key: 'listing_expired', label: 'Shpallja skadoi' },
  { key: 'listing_expiring_soon', label: 'Shpallja po skadon' },
];

export default function Settings() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token, user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, retry] = useState(0);
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaved,   setPwSaved]   = useState(false);
  const [pwError,   setPwError]   = useState('');

  const [prefs,      setPrefs]      = useState<Record<string, boolean>>({});
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  const savedProfile = useRef<{name: string; phone: string; prefs: Record<string,boolean>}>({name: '', phone: '', prefs: {}});
  const { dirty, markSaved } = useUnsavedChanges({name, phone, prefs}, !loading && !loadError);
  function savedPart(patch: Partial<typeof savedProfile.current>) { savedProfile.current = {...savedProfile.current, ...patch}; markSaved(savedProfile.current); }
  useEffect(() => {
    if (!token) return;
    let active = true; setLoading(true); setLoadError('');
    Promise.all([
      adminFetch<{name: string; phone?: string}>('/users/me'),
      adminFetch<Record<string, boolean>>('/users/me/notification-prefs'),
    ]).then(([profile, p]) => {
      if (!active) return;
      if (typeof profile.name !== 'string' || !p || typeof p !== 'object' || Array.isArray(p) || Object.values(p).some(value => typeof value !== 'boolean')) throw new Error('Përgjigjja e serverit nuk është e vlefshme.');
      setName(profile.name); setPhone(profile.phone ?? '');
      const merged: Record<string, boolean> = {};
      NOTIF_PREFS.forEach(({key}) => { merged[key] = p[key] !== false; }); setPrefs(merged); savedProfile.current = {name: profile.name, phone: profile.phone ?? '', prefs: merged};
    }).catch(error => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, revision]);

  async function saveProfile(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    setProfileError('');
    const res = await authFetch(`${API}/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    if (res.ok) { setProfileSaved(true); savedPart({name, phone}); await refreshUser();  }
    else { const d = await res.json() as { message?: string }; setProfileError(d.message ?? 'Gabim'); }

 });
}

  async function changePassword(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Fjalëkalimet nuk përputhen'); return; }
    if (newPw.length < 8) { setPwError('Minimumi 8 karaktere'); return; }
    try {
      await adminFetch('/users/me/change-password', undefined, {
        method: 'POST', body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwSaved(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      await logout();
      router.replace('/auth/hyr?passwordChanged=1');
    } catch (error) {
      setPwError(error instanceof Error ? error.message : 'Nuk mund të lidhem me serverin');
    }

 });
}

  async function savePrefs() {
 return runAction(async () => {

    if (!token) return;
    setPrefsError(''); setPrefsSaved(false);
    try {
      await adminFetch('/users/me/notification-prefs', undefined, { method: 'PATCH', body: JSON.stringify(prefs) });
      setPrefsSaved(true); savedPart({prefs});
    } catch (error) { setPrefsError(error instanceof Error ? error.message : 'Ruajtja dështoi'); }


 });
}

  const section = 'bg-white rounded-xl shadow-sm border border-gray-100 p-5';

  if (loading) return <p role="status">Duke ngarkuar cilësimet…</p>;
  if (loadError) return <Feedback message={loadError} type="error" retry={() => retry(n => n+1)} />;

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-5">
      {dirty && <p role="status" className="text-sm text-amber-800">Keni ndryshime të paruajtura.</p>}
      <h1 className="text-lg font-bold text-dark">Cilësimet</h1>

      {/* Profile */}
      <div className={section}>
        <h2 className="font-bold text-dark mb-4">Profili</h2>
        {profileError && (
          <Feedback message={profileError} type="error" />
        )}
        {profileSaved && (
          <div role="status" className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">Profili u ruajt!</div>
        )}
        <ValidatedForm onSubmit={saveProfile} className="space-y-3">
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Emri</label>
            <input
              value={name}
              onChange={e => setName(e.currentTarget.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Numri i Telefonit</label>
            <input
              value={phone}
              onChange={e => setPhone(e.currentTarget.value)}
              type="tel"
              placeholder="+383..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </Field>
          <Field>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </Field>
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors"
          >
            Ruaj Profilin
          </button>
        </ValidatedForm>
      </div>

      {/* Password */}
      <div className={section}>
        <h2 className="font-bold text-dark mb-4">Ndrysho Fjalëkalimin</h2>
        {pwError && (
          <Feedback message={pwError} type="error" />
        )}
        {pwSaved && (
          <div role="status" className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">Fjalëkalimi u ndryshua!</div>
        )}
        <p className="text-sm text-gray-600 mb-3">Fjalëkalimi i ri kërkon të paktën 8 karaktere. Pas ndryshimit, hyni përsëri.</p>
        <ValidatedForm onSubmit={changePassword} className="space-y-3">
          {[
            { label: 'Fjalëkalimi Aktual', value: currentPw, setter: setCurrentPw },
            { label: 'Fjalëkalimi i Ri',   value: newPw,     setter: setNewPw },
            { label: 'Konfirmo',           value: confirmPw, setter: setConfirmPw },
          ].map(({ label, value, setter }) => (
            <Field key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => setter(e.currentTarget.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </Field>
          ))}
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Ndrysho Fjalëkalimin
          </button>
        </ValidatedForm>
      </div>

      {prefsError && <Feedback message={prefsError} type="error" />}
      {/* Notification preferences */}
      <div className={section}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-dark">Njoftimet me Email</h2>
          {prefsSaved && (
            <span className="text-xs text-green-700 font-semibold">Ruajtur ✓</span>
          )}
        </div>
        <div className="space-y-3">
          {NOTIF_PREFS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <button
                type="button"
                role="switch" aria-label={label} aria-checked={!!prefs[key]}
                onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  prefs[key] ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    prefs[key] ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={savePrefs}
          className="mt-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          Ruaj Preferencat
        </button>
      </div>
    </div>
  </ActionRegion>;
}
