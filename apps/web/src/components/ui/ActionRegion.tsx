'use client';
import type { ReactNode } from 'react';
import Feedback from './Feedback';

export default function ActionRegion({busy, error, children}: {busy: boolean; error: string; children: ReactNode}) {
  return <div aria-busy={busy} className="min-w-0">
    {error && <Feedback type="error" message={error} />}
    {busy && <p role="status" className="mb-3 text-sm text-primary">Veprimi po kryhet…</p>}
    <fieldset disabled={busy} className="min-w-0 border-0 p-0 m-0">{children}</fieldset>
  </div>;
}
