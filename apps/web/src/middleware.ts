import { NextResponse } from 'next/server';

export function middleware() {

  // ── Security headers ──────────────────────────────────────────────────────
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Extract origin (scheme + host + port) from API URL for CSP
  const apiOrigin = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin; }
    catch { return 'http://localhost:3001'; }
  })();
  const imageOrigin = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001').origin; }
    catch { return 'http://localhost:4001'; }
  })();

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${imageOrigin}`,
      `connect-src 'self' ${apiOrigin} ${imageOrigin} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://analytics.google.com https://stats.g.doubleclick.net`,
      "font-src 'self' data:",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://www.facebook.com https://x.com https://wa.me",
    ].join('; '),
  );

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
