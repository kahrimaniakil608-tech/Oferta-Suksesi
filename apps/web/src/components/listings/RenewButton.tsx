'use client';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/session';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface RenewButtonProps {
  listingId: string;
  ownerId: string;
  status: string;
  renewalCount: number;
  bumpedAt?: string | null;
}

export default function RenewButton({ listingId, ownerId, status, renewalCount, bumpedAt }: RenewButtonProps) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  // Only show for the listing owner
  if (!user || user.id !== ownerId) return null;

  // Max 5 renewals
  if (renewalCount >= 5) return null;

  // Check cooldown (7 days) for non-expired listings
  if (status !== 'EXPIRED' && bumpedAt) {
    const nextBump = new Date(new Date(bumpedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Date.now() < nextBump.getTime()) {
      const daysLeft = Math.ceil((nextBump.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return (
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">
            Mund të rinovoni pas {daysLeft} ditëve
          </p>
        </div>
      );
    }
  }

  async function handleRenew() {
    if (!token || loading || !confirm('Rinovimi mund ta dërgojë shpalljen në shqyrtim. Dëshironi të vazhdoni?')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await authFetch(`${API}/listings/${listingId}/renew`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message ?? 'Gabim gjatë rinovimit');
        return;
      }
      setDone(true);
      if (data.status !== 'PUBLISHED') router.push('/paneli/shpalljet?saved=1&status=' + encodeURIComponent(data.status)); else router.refresh();
      setMessage(data.status === 'PUBLISHED' ? 'Shpallja u rinovua me sukses.' : 'Shpallja u dërgua për shqyrtim.');
    } catch {
      setMessage('Nuk mund të lidhem me serverin');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
        <p className="text-sm text-green-700 font-medium">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Menaxho Shpalljen
      </h3>
      <button
        onClick={handleRenew}
        disabled={loading}
        className="w-full py-2.5 bg-green-700 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {loading ? 'Duke rinovuar...' : status === 'EXPIRED' ? '🔄 Riaktivizo Shpalljen' : '⬆ Rinovo / Ngjit lart'}
      </button>
      <p className="text-xs text-gray-400 text-center mt-1.5">
        {status === 'EXPIRED'
          ? 'Kërkohet rinovimi sipas afatit aktual; mund të ketë shqyrtim.'
          : 'Rinovon afatin dhe pozicionin; mund të ketë shqyrtim.'
        }
        {renewalCount > 0 && ` · ${renewalCount}/5 rinovime`}
      </p>
      {message && (
        <p role="alert" className="text-xs text-red-700 text-center mt-1">{message}</p>
      )}
    </div>
  );
}
