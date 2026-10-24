const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
let refreshPromise: Promise<boolean> | null = null;
let sessionQueue: Promise<void> = Promise.resolve();

/** Serialize cookie changes within the page and across tabs supporting Web Locks. */
export function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request("oferta-auth-refresh", operation);
    }
    return operation();
  };
  const task = sessionQueue.then(run, run);
  sessionQueue = task.then(
    () => {},
    () => {},
  );
  return task;
}

export function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const task = withSessionLock(async () => {
    // A waiting tab may already have received the new cookies from another tab.
    const current = await fetch(`${API}/users/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (current.ok) return true;
    if (current.status !== 401) return false;
    const response = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("oferta-session-ended"));
    }
    return response.ok;
  })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  refreshPromise = task;
  return task;
}

/** Cookie-authenticated requests share expiry recovery across all user flows. */
export async function authFetch(
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const request = () => fetch(input, { ...options, credentials: "include" });
  let response = await request();
  if (response.status === 401 && (await refreshSession()))
    response = await request();
  return response;
}
