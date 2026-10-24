'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { reportListing } from '@/lib/client-api';

interface ReportModalProps {
  listingId: string;
}

const REASONS = [
  { value: 'SPAM',           label: 'Spam ose reklamë' },
  { value: 'FAKE',           label: 'Shpallje false' },
  { value: 'INAPPROPRIATE',  label: 'Përmbajtje e papërshtatshme' },
  { value: 'WRONG_CATEGORY', label: 'Kategori e gabuar' },
  { value: 'SOLD',           label: 'Tashmë e shitur' },
  { value: 'OTHER',          label: 'Tjetër' },
];

export default function ReportModal({ listingId }: ReportModalProps) {
  const { user } = useAuth();
  const [isOpen,   setIsOpen]   = useState(false);
  const [reason,   setReason]   = useState('');
  const [details,  setDetails]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    setError('');
    const result = await reportListing(listingId, reason, details || undefined);
    setLoading(false);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => { setIsOpen(false); setSuccess(false); setReason(''); setDetails(''); }, 2000);
    } else {
      setError(result.error ?? 'Gabim i panjohur');
    }
  }

  return (
    <>
      <button
        onClick={() => { if (!user) { location.href = `/auth/hyr?redirect=${encodeURIComponent(location.pathname + location.search)}`; return; } setIsOpen(true); }}
        className="text-xs text-gray-400 hover:text-red-700 transition-colors flex items-center gap-1"
      >
        <FlagIcon className="w-3.5 h-3.5" />
        {user ? 'Raporto shpalljen' : 'Hyr për të raportuar'}
      </button>

      {isOpen && (
        <Modal label="Raporto shpalljen" onClose={() => setIsOpen(false)}>

          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 id="report-title" className="font-bold text-dark">Raporto Shpalljen</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Mbyll"
              >
                <XIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckIcon className="w-6 h-6 text-accent" />
                </div>
                <p className="font-semibold text-dark">Raporti u dërgua!</p>
                <p className="text-sm text-gray-500 mt-1">Faleminderit për ndihmën tënde.</p>
              </div>
            ) : (
              <ValidatedForm onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Arsyeja
                  </label>
                  <div className="space-y-2">
                    {REASONS.map((r) => (
                      <label key={r.value} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                          className="w-4 h-4 text-accent accent-accent"
                        />
                        <span className="text-sm text-dark">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="report-details"
                    className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                  >
                    Detaje (opsionale)
                  </label>
                  <textarea
                    id="report-details"
                    value={details}
                    onChange={(e) => setDetails(e.currentTarget.value)}
                    rows={3}
                    placeholder="Shkruaj më shumë detaje..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-dark resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>

                {error && (
                  <Feedback message={error} type="error" />
                )}

                <button
                  type="submit"
                  disabled={!reason || loading}
                  className="w-full py-2.5 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {loading ? 'Duke dërguar…' : 'Dërgo Raportin'}
                </button>
              </ValidatedForm>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18m0-12l4-4 4 4 4-4 4 4" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
