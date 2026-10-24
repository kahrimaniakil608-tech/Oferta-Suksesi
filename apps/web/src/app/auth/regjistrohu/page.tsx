'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const returnPath = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') ?? '/' : '/';
  const redirect = returnPath.startsWith('/') && !returnPath.startsWith('//') && !returnPath.includes('\\') ? returnPath : '/';

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Fjalëkalimet nuk përputhen');
      return;
    }
    if (password.length < 8) {
      setError('Fjalëkalimi duhet të ketë të paktën 8 karaktere');
      return;
    }
    if (!turnstileToken) {
      setError('Ju lutem prisni verifikimin anti-bot.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(name.trim(), email, password, turnstileToken);
    setLoading(false);
    if (result.ok) {
      const target = new URLSearchParams(location.search).get('redirect');
      router.push(target?.startsWith('/') && !target.startsWith('//') && !target.includes('\\') ? target : '/');
    } else {
      setError(typeof result.error === 'string' ? result.error : 'Gabim gjatë regjistrimit');
      turnstileRef.current?.reset();
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
          <h1 className="text-2xl font-bold text-dark mt-5 mb-1">Krijo llogari</h1>
          <p className="text-gray-500 text-sm">Fillo të postosh shpallje falas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ValidatedForm onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Emri i Plotë
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Emri Mbiemri"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
              />
            </div>

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

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Fjalëkalimi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Minimum 8 karaktere"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPw ? 'Fshih' : 'Shfaq'}
                >
                  {showPw
                    ? <EyeOffIcon className="w-4 h-4" />
                    : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Konfirmo Fjalëkalimin
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                placeholder="Përsërit fjalëkalimin"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white ${
                  confirm && confirm !== password
                    ? 'border-red-300 focus:ring-red-300/40'
                    : 'border-gray-200 focus:ring-accent/40'
                }`}
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
              className="w-full py-3 bg-accent hover:bg-accent/90 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? 'Duke krijuar llogarinë…' : 'Krijo Llogarinë'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Duke u regjistruar, pranon{' '}
              <Link href="/kushtet-e-perdorimit" className="text-accent underline hover:no-underline">Kushtet e Përdorimit</Link>.
            </p>
          </ValidatedForm>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Ke llogari?{' '}
          <Link href={`/auth/hyr?redirect=${encodeURIComponent(redirect)}`} className="text-accent font-semibold hover:underline">
            Hyr
          </Link>
        </p>
      </div>
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}
