import { refreshSession } from './session';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function adminFetch<T>(
  path: string,
  _token?: string,
  options?: RequestInit,
): Promise<T> {
  const doFetch = () =>
    fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });

  let res = await doFetch();

  // On 401, attempt a single token refresh and retry
  if (res.status === 401) {
    const ok = await refreshSession();
    if (ok) {
      res = await doFetch();
    }
  }

  if (res.status === 204) return {} as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? `Shërbimi nuk është i disponueshëm (${res.status}). Provoni përsëri.`), res.status);
  if (data === null) throw new ApiError('Përgjigjja e serverit nuk mund të lexohet. Provoni përsëri.', res.status);
  return data;
}
