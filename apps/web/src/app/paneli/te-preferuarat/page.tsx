'use client';
import ListingPrice from '@/components/listings/ListingPrice';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import { authFetch } from '@/lib/session';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo, imgSrc } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface Listing {
  id: string; slug: string; title: string; status: string;
  createdAt: string; isFeatured: boolean;
  attributes: Record<string, unknown>;
  category?: { name: string };
  city?: { name: string };
  images: Array<{ thumbUrl: string }>;
}

export default function Favourites() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total,    setTotal]    = useState(0);
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const [page, setPage] = useState(1);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError('');
    authFetch(`${API}/users/me/favourites?page=${page}&limit=20`, {
      credentials: 'include',
    })
      .then(r => { if (!r.ok) throw new Error('Të preferuarat nuk u ngarkuan.'); return r.json(); })
      .then((r: any) => {
        setListings(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []);
        setTotal(r.meta?.total ?? (Array.isArray(r.data) ? r.data.length : 0));
      })
      .catch(error => setError(error.message))
      .finally(() => setLoading(false));
  }, [token, page, revision]);

  async function removeFavourite(listingId: string) {
 return runAction(async () => {

    if (!token) return;
    try {
    const response = await authFetch(`${API}/users/me/favourites/${listingId}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Ndryshimi dështoi.');
    setListings(prev => prev.filter(l => l.id !== listingId));
    setTotal(t => t - 1);
    } catch { setError("Ndryshimi dështoi. Provoni përsëri."); }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {error && <p role="alert">{error} <button onClick={() => retry(n => n+1)}>Provo përsëri</button></p>}
      <nav className="flex gap-4" aria-label="Faqet e të preferuarave"><button disabled={page === 1} onClick={() => setPage(p => p-1)}>← Para</button><span>{page}</span><button disabled={page*20 >= total} onClick={() => setPage(p => p+1)}>Tjetër →</button></nav>
      <h1 className="text-lg font-bold text-dark">
        Të Preferuarat <span className="text-gray-400 font-normal text-sm">({total})</span>
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">♡</p>
          <p className="text-gray-500 font-medium mb-2">Nuk keni shpallje të preferuara</p>
          <p className="text-sm text-gray-400 mb-4">Shtoni shpallje si të preferuara duke klikuar ikonën e zemrës.</p>
          <Link href="/" className="text-primary text-sm font-semibold hover:underline">
            Shfleto shpalljet →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
              {/* Image */}
              <div className="relative aspect-4/3 bg-gray-100">
                {l.images[0] ? (
                  <img
                    src={imgSrc(l.images[0].thumbUrl)}
                    alt={l.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
                )}
                {l.isFeatured && (
                  <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    E veçuar
                  </span>
                )}
                <button
                  onClick={() => removeFavourite(l.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                  title="Hiq nga të preferuarat"
                >
                  ♥
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-dark truncate">{l.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {l.category?.name} · {l.city?.name}
                </p>
                <ListingPrice attributes={l.attributes} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{timeAgo(l.createdAt)}</span>
                  <Link
                    href={`/shpalljet/${l.slug}`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Shiko →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </ActionRegion>;
}
