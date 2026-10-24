'use client';

import Script from 'next/script';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function GoogleAnalyticsInner() {
  const [gaId, setGaId] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch(`${API}/site-config`)
      .then(r => r.json())
      .then(data => {
        // Validate GA ID format to prevent script injection
        if (data.googleAnalyticsId && /^G-[A-Z0-9]+$/i.test(data.googleAnalyticsId)) {
          setGaId(data.googleAnalyticsId);
        }
      })
      .catch(() => {});
  }, []);

  // Track client-side route changes
  useEffect(() => {
    if (!gaId || !window.gtag) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    window.gtag('config', gaId, { page_path: url });
  }, [gaId, pathname, searchParams]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  );
}
