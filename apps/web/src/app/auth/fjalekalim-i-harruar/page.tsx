'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Ju lutem prisni verifikimin anti-bot.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, turnstileToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Diçka shkoi keq. Provo përsëri.');
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Diçka shkoi keq. Provo përsëri.');
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo-black.png" alt="Oferta Suksesi" className="h-10 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-dark mt-5 mb-1">Rivendos Fjalekalimin</h1>
          <p className="text-gray-500 text-sm">
            Shkruaj email-in tënd dhe do të marrësh një link për ta rivendosur fjalëkalimin.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Nëse ky email ekziston në sistemin tonë, do të marrësh një link për të rivendosur fjalëkalimin.
              </p>
              <p className="text-xs text-gray-400">Kontrollo edhe dosjen e spam-it.</p>
            </div>
          ) : (
            <ValidatedForm onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Adresa Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  placeholder="emri@shembull.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
                />
              </div>

              {error && (
                <Feedback message={error} type="error" />
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
                options={{ theme: 'light', size: 'compact' }}
              />

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full py-3 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {loading ? 'Duke dërguar…' : 'Dërgo Linkun'}
              </button>
            </ValidatedForm>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          <Link href="/auth/hyr" className="text-accent font-semibold hover:underline">
            Kthehu te Hyrja
          </Link>
        </p>
      </div>
    </div>
  );
}
