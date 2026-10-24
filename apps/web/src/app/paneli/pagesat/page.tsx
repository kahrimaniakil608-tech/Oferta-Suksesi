'use client';
import Feedback from '@/components/ui/Feedback';
import { authFetch } from '@/lib/session';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface Payment {
  id: string; amount: string; currency: string;
  type: string; status: string; createdAt: string;
  listing?: { id: string; title: string };
}

const TYPE_LABEL: Record<string, string> = {
  FEATURED:        'Shpallje e Zgjedhur',
  URGENT:          'Shpallje Urgjente',
  COMPANY_PREMIUM: 'Kompani Premium',
};

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  FAILED:    'bg-red-100 text-red-700',
};

export default function Payments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setLoading(true); setError('');
    authFetch(`${API}/users/me/payments?page=${page}`, { signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error('Pagesat nuk u ngarkuan'); return res.json(); })
      .then(result => { setPayments(result.data); setTotal(result.total); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-dark">Pagesat</h1>

      {error && <Feedback message={error} type="error" />}
      <nav className="flex gap-4"><button disabled={page === 1} onClick={() => setPage(p => p-1)}>Mbrapa</button><span>{page}</span><button disabled={page*20 >= total} onClick={() => setPage(p => p+1)}>Para</button></nav>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : error ? null : payments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-gray-500 font-medium mb-1">Nuk ka pagesa ende</p>
            <p className="text-sm text-gray-400">
              Pagesat për shpallje të zgjedhura dhe kompani premium do të shfaqen këtu.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Shërbimi</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Shuma</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Statusi</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-dark text-xs">{TYPE_LABEL[p.type] ?? p.type}</p>
                    {p.listing && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{p.listing.title}</p>}
                  </td>
                  <td className="px-3 py-3 text-sm font-bold text-dark">
                    {Number(p.amount).toLocaleString()} {p.currency}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status] ?? 'bg-gray-100'}`}>
                      {p.status === 'COMPLETED' ? 'Paguar' : p.status === 'PENDING' ? 'Në pritje' : 'Dështuar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString('sq-AL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
