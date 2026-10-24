import { authFetch } from './session';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function contactListing(
  id: string,
  contactType: 'PHONE' | 'WHATSAPP' | 'VIBER' | 'EMAIL',
): Promise<void> {
  try {
    await fetch(`${API_URL}/listings/${id}/contact`, {
      method: 'POST', keepalive: true, signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactType }),
    });
  } catch {
    // non-critical — fire and forget
  }
}

export async function reportListing(
  id: string,
  reason: string,
  details?: string,
  _token?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authFetch(`${API_URL}/listings/${id}/report`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, details }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message ?? 'Gabim gjatë raportimit' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Nuk mund të lidhem me serverin' };
  }
}
