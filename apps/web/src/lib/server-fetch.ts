import "server-only";
import { createHmac } from "node:crypto";
export function serverApiFetch(input: string | URL, options?: RequestInit) {
  const headers = new Headers(options?.headers);
  if (process.env.JWT_SECRET)
    headers.set(
      "X-Internal-Render",
      createHmac("sha256", process.env.JWT_SECRET)
        .update("oferta:ssr:v1")
        .digest("hex"),
    );
  return fetch(input, {
    ...options,
    headers,
    signal: options?.signal ?? AbortSignal.timeout(8000),
  });
}
