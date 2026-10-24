'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') ?? '/';
  // Prevent open redirect — only allow relative paths
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('\\') ? rawRedirect : '/';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      router.push(redirect);
    } else {
      setError(result.error ?? 'Gabim gjatë hyrjes');
    }
  }

  return (
    <ValidatedForm onSubmit={handleSubmit} className="space-y-4">
      {searchParams.get('passwordChanged') === '1' && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Fjalëkalimi u ndryshua. Kyçuni me fjalëkalimin e ri.</p>}
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
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Fjalëkalimi
          </label>
          <Link href="/auth/fjalekalim-i-harruar" className="text-xs text-accent underline hover:no-underline">
            E harrove?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
          >
            {showPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <Feedback message={error} type="error" />
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        {loading ? 'Duke hyrë…' : 'Hyr në Llogari'}
      </button>
        <p className="text-center text-sm text-gray-500 mt-5">
          Nuk ke llogari?{' '}
          <Link href={`/auth/regjistrohu?redirect=${encodeURIComponent(redirect)}`} className="text-accent font-semibold hover:underline">
            Regjistrohu falas
          </Link>
        </p>
    </ValidatedForm>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo-black.png" alt="Oferta Suksesi" className="h-10 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-dark mt-5 mb-1">Mirë se u ktheve!</h1>
          <p className="text-gray-500 text-sm">Hyr në llogarinë tënde</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-50 rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>


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
