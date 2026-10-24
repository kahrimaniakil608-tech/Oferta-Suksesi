'use client';

import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/session';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface FavouriteButtonProps {
  listingId: string;
}

export default function FavouriteButton({ listingId }: FavouriteButtonProps) {
  const { token, isLoading: authLoading } = useAuth();
  const [favourited, setFavourited] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    setFavourited(false); setStatusError(''); setError('');
    if (!token) { setChecking(false); return; }
    const controller = new AbortController();
    setChecking(true);
    authFetch(`${API}/users/me/favourites/${listingId}/status`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => {
        if (controller.signal.aborted) return;
        if (typeof data.favourited !== 'boolean') throw new Error();
        setFavourited(data.favourited);
      })
      .catch(() => { if (!controller.signal.aborted) setStatusError('Preferencat nuk u ngarkuan.'); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [token, listingId, attempt]);

  async function toggle() {
    if (!token) {
      window.location.href = `/auth/hyr?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (lock.current || checking || statusError || authLoading) return;
    lock.current = true;
    setLoading(true); setError('');
    try {
      const res = await authFetch(`${API}/users/me/favourites/${listingId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Preferenca nuk u ruajt. Provo përsëri.');
      const data = await res.json();
      if (typeof data.favourited !== 'boolean') throw new Error();
      setFavourited(data.favourited);
    } catch {
      setError('Preferenca nuk u ruajt. Provo përsëri.');
    } finally {
      setLoading(false);
      lock.current = false;
    }
  }

  return (
    <span><button
      aria-pressed={favourited}
      onClick={toggle}
      disabled={loading || checking || authLoading || !!statusError}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
        favourited
          ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-700'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={favourited ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill={favourited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        />
      </svg>
      {loading ? 'Duke ruajtur…' : checking || authLoading ? 'Duke ngarkuar…' : favourited ? 'E preferuar' : 'Prefero'}
    </button>{statusError && <span role="alert" className="block mt-2 text-xs text-red-700">{statusError} <button onClick={() => setAttempt(n => n+1)} className="underline">Provo përsëri</button></span>}{error && <span role="alert" className="block text-xs text-red-700">{error}</span>}</span>
  );
}
