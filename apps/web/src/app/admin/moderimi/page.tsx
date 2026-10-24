'use client';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import ImageGallery from '@/components/listings/ImageGallery';
import Toast from '@/components/ui/Feedback';
import Modal from '@/components/ui/Modal';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { timeAgo } from '@/lib/utils';

const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

interface QueueItem {
  id: string;
  title: string;
  description?: string;
  spamScore?: number;
  createdAt: string;
  images?: { url: string }[];
  category?: { name: string };
  city?: { name: string };
  user?: {
    id: string;
    name: string;
    trustScore: number;
    badges?: { id: string; label: string; icon: string; color: string }[];
  };
}

const REJECT_REASONS = [
  'Spam',
  'Duplikat',
  'Përmbajtje e papërshtatshme',
  'Kategori e gabuar',
  'Informacion i mangët',
];

type SortOption = 'spam' | 'newest' | 'oldest';



function SpamBar({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const color = pct < 30 ? 'bg-green-500' : pct < 60 ? 'bg-amber-700' : 'bg-red-700';
  const label = pct < 30 ? 'text-green-700' : pct < 60 ? 'text-amber-700' : 'text-red-700';
  const bg    = pct < 30 ? 'bg-green-50'   : pct < 60 ? 'bg-amber-50'   : 'bg-red-50';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${bg} ${label}`}>{pct}%</span>
    </div>
  );
}

export default function ModerationQueuePage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();
  const [queue,   setQueue]   = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState<SortOption>('newest');
  const [toast,   setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [page,    setPage]    = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,   setTotal]   = useState(0);

  // Reject state
  const [rejectId,     setRejectId]     = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing,   setProcessing]   = useState<Set<string>>(new Set());

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });

  };

  useEffect(() => {
    if (!token) return;
    setLoading(true); setLoadError('');
    adminFetch<{ data: QueueItem[]; total: number; totalPages: number }>(`/admin/listings/moderation-queue?page=${page}&limit=20&sort=${sort}`, token)
      .then(r => {
        setQueue(r.data ?? []);
        setTotal(r.total ?? 0);
        setTotalPages(r.totalPages ?? 1);
        if (page > Math.max(1,r.totalPages || 1)) setPage(Math.max(1,r.totalPages || 1));
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, page, sort, revision]);

  async function approve(id: string) {
 return runAction(async () => {

    if (!token) return;
    setProcessing(p => new Set(p).add(id));
    try {
      await adminFetch(`/admin/listings/${id}/approve`, token, { method: 'POST' });
      setQueue(prev => prev.filter(q => q.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setRevision(n => n + 1);
      showToast('Shpallja u aprovua ✓');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    } finally {
      setProcessing(p => { const n = new Set(p); n.delete(id); return n; });
    }

 });
}

  async function reject(id: string) {
 return runAction(async () => {

    if (!token) return;
    setProcessing(p => new Set(p).add(id));
    try {
      await adminFetch(`/admin/listings/${id}/reject`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason || 'Refuzuar nga moderatori' }),
      });
      setQueue(prev => prev.filter(q => q.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setRevision(n => n + 1);
      setRejectId(null); setRejectReason('');
      showToast('Shpallja u refuzua');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim', 'error');
    } finally {
      setProcessing(p => { const n = new Set(p); n.delete(id); return n; });
    }

 });
}

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-dark flex items-center gap-2">
            Moderimi
            {!loading && total > 0 && (
              <span className="bg-red-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {loading ? 'Duke ngarkuar…' : total > 0 ? `${total} shpallje në pritje` : 'Të gjitha shpalljet janë moderuar'}
          </p>
        </div>
        <select aria-label="Renditja e radhës" value={sort} onChange={e => { setSort(e.currentTarget.value as SortOption); setPage(1); }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-primary">
          <option value="newest">Më të reja</option>
          <option value="oldest">Më të vjetrat</option>
          <option value="spam">Rreziku i përmbajtjes (më i larti)</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white rounded-xl animate-pulse border border-gray-100" />)}
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-lg font-semibold text-dark">Nuk ka shpallje në pritje!</p>
          <p className="text-sm text-gray-400 mt-1">Radha e moderimit është e zbrazët.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queue.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
              processing.has(item.id) ? 'opacity-50 pointer-events-none' : 'border-gray-100'
            }`}>
              {/* Image + content */}
              <div className="flex gap-3 p-4">
                {item.images?.[0] ? (
                  <img src={`${IMAGE_BASE}/uploads/${item.images[0].url}`} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-2xl">🖼️</div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-dark text-sm truncate">{item.title}</h2>
                  {item.description && (
                    <details className="mt-2 text-sm"><summary className="cursor-pointer underline">Lexo përshkrimin e plotë</summary><p className="whitespace-pre-wrap mt-2">{item.description}</p></details>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
                    {item.category && <span>📂 {item.category.name}</span>}
                    {item.city && <span>📍 {item.city.name}</span>}
                    <span>🕐 {timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Author info */}
              {item.user && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {item.user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-600">{item.user.name}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.user.trustScore}%` }} />
                    </div>
                    <span className={`text-xs font-semibold ${item.user.trustScore < 20 ? 'text-red-700' : item.user.trustScore < 40 ? 'text-amber-800' : 'text-green-700'}`}>
                      {item.user.trustScore}
                    </span>
                  </div>
                  {item.user.badges?.map(b => (
                    <span key={b.id} className="text-sm" title={b.label}>{b.icon}</span>
                  ))}
                </div>
              )}

              {/* Spam score */}
              {!!item.images?.length && <details className="my-3"><summary className="cursor-pointer text-sm underline">Shqyrto të gjitha fotot ({item.images.length})</summary><ImageGallery title={item.title} images={item.images.map((image, i) => ({id: String(i), url: image.url, thumbUrl: image.url, mediumUrl: image.url, isPrimary: i === 0, position: i, altText: null}))} /></details>}
              <p className="text-xs text-gray-600 mb-2">Kontrolloni përputhjen e titullit, fotos, kategorisë dhe kontaktit. Vlerësimi automatik është një sinjal për shqyrtim, jo provë shkeljeje.</p>
              {item.spamScore !== undefined && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Vlerësimi automatik</span>
                  </div>
                  <SpamBar score={item.spamScore} />
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <a href={`/admin/shpalljet/${item.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors text-center">
                  👁 Shiko
                </a>
                <button onClick={() => approve(item.id)} disabled={processing.has(item.id)}
                  className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors">
                  ✓ Aprovo
                </button>
                <button onClick={() => { setRejectId(item.id); setRejectReason(''); }} disabled={processing.has(item.id)}
                  className="flex-1 py-2.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
                  ✕ Refuzo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Para
          </button>
          <span className="text-xs text-gray-500">
            Faqja {page} nga {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Tjetra
          </button>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectId && (
        <Modal label="Arsyeja e Refuzimit" onClose={() => { setRejectId(null); setRejectReason(''); }} className="w-[min(32rem,calc(100%-2rem))]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-sm font-bold text-dark mb-4">Arsyeja e Refuzimit</h2>
            <div className="space-y-2 mb-4">
              {REJECT_REASONS.map(r => (
                <button key={r} onClick={() => setRejectReason(r)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                    rejectReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {r}
                </button>
              ))}
              <input type="text" placeholder="Arsye tjetër…"
                value={!REJECT_REASONS.includes(rejectReason) ? rejectReason : ''}
                onChange={e => setRejectReason(e.currentTarget.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                Anulo
              </button>
              <button onClick={() => rejectId && reject(rejectId)}
                className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">
                Refuzo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </ActionRegion>;
}
