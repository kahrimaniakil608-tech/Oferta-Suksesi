'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { adminFetch, ApiError } from '@/lib/admin-api';
import { withSessionLock } from '@/lib/session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  slug: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** @deprecated Tokens are now in httpOnly cookies. Kept for API compat. */
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  /** @deprecated Use refreshUser instead */
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const generation = useRef(0);

  // A late hydration response must not sign the user back in after logout/login.
  useEffect(() => {
    let cancelled = false;
    const started = generation.current;
    adminFetch<AuthUser>('/users/me')
      .then(data => { if (!cancelled && started === generation.current) setUser(data); })
      .catch(error => { if (!(error instanceof ApiError && error.status === 401)) setAuthError('Lidhja me llogarinë dështoi. Rifreskoni faqen për të provuar përsëri.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    const ended = () => { generation.current++; setUser(null); };
    window.addEventListener('oferta-session-ended', ended);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('oferta-auth') : null;
    if (channel) channel.onmessage = event => { if (event.data === 'logout') ended(); };
    return () => { cancelled = true; window.removeEventListener('oferta-session-ended', ended); channel?.close(); };
  }, []);

  async function login(email: string, password: string) {
    generation.current++;
    setAuthError('');
    try {
      const res = await withSessionLock(() => fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      }));
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message ?? 'Email ose fjalëkalim i gabuar' };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Nuk mund të lidhem me serverin' };
    }
  }

  async function register(name: string, email: string, password: string, turnstileToken?: string) {
    generation.current++;
    setAuthError('');
    try {
      const res = await withSessionLock(() => fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, turnstileToken }),
      }));
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message ?? 'Gabim gjatë regjistrimit' };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Nuk mund të lidhem me serverin' };
    }
  }

  const logout = useCallback(async () => {
    generation.current++;
    try {
      const response = await withSessionLock(() => fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }));
      if (!response.ok) throw new Error('Logout failed');
      setUser(null);
      setAuthError('');
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('oferta-auth');
        channel.postMessage('logout');
        channel.close();
      }
      return true;
    } catch {
      setAuthError('Dalja nuk u konfirmua nga serveri. Ju lutem provoni përsëri.');
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const started = generation.current;
    try {
      const data = await adminFetch<AuthUser>('/users/me');
      if (started === generation.current) setUser(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && started === generation.current) setUser(null);
    }
  }, []);

  // Deprecated shim — token is in httpOnly cookie now, but kept for compat
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    await refreshUser();
    return 'cookie';
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, token: user ? 'cookie' : null, isLoading, login, register, logout, refreshUser, refreshAccessToken }}>
      {authError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-lg">
        {authError}<button type="button" onClick={() => setAuthError('')} className="ml-4 underline">Mbyll</button>
      </div>}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
