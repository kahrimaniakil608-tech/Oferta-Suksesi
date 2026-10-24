'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => setTokenValid(data.valid === true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Fjalëkalimet nuk përputhen.');
      return;
    }
    if (password.length < 8) {
      setError('Fjalëkalimi duhet të ketë së paku 8 karaktere.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Linku ka skaduar ose nuk është valid.');
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/hyr'), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Diçka shkoi keq. Provo përsëri.');
    } finally {
      setLoading(false);
    }
  }

  if (!token || tokenValid === false) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-red-700">Linku ka skaduar ose është përdorur tashmë. Kërko një link të ri.</p>
        <Link href="/auth/fjalekalim-i-harruar" className="text-accent text-sm font-semibold hover:underline">
          Kërko link të ri
        </Link>
      </div>
    );
  }

  if (tokenValid === null) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">Fjalëkalimi u ndryshua me sukses!</p>
        <p className="text-xs text-gray-400">Duke të ridrejtuar te hyrja…</p>
      </div>
    );
  }

  return (
    <ValidatedForm onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Fjalëkalimi i Ri
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Së paku 8 karaktere"
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

      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Konfirmo Fjalëkalimin
        </label>
        <input
          id="confirmPassword"
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          placeholder="Përsërit fjalëkalimin"
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white ${
            mismatch ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {mismatch && (
          <p className="text-xs text-red-700 mt-1">Fjalëkalimet nuk përputhen.</p>
        )}
      </div>

      {error && (
        <Feedback message={error} type="error" />
      )}

      <button
        type="submit"
        disabled={loading || mismatch}
        className="w-full py-3 bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        {loading ? 'Duke ndryshuar…' : 'Ndrysho Fjalëkalimin'}
      </button>
    </ValidatedForm>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo-black.png" alt="Oferta Suksesi" className="h-10 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-dark mt-5 mb-1">Fjalëkalim i Ri</h1>
          <p className="text-gray-500 text-sm">Vendos fjalëkalimin e ri për llogarinë tënde.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-50 rounded-xl" />}>
            <ResetPasswordForm />
          </Suspense>
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
