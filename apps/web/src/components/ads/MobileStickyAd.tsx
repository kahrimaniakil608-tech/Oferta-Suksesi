'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AdBanner from './AdBanner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ZoneAd {
  id: string;
  title: string;
  adType?: string;
  imageUrl?: string | null;
  embedCode?: string | null;
  targetUrl: string;
}

interface ZoneResponse {
  zone: { width: number; height: number };
  ads: ZoneAd[];
}

/**
 * Sticky mobile banner ad (320×50) that sits just above the bottom navigation.
 * Only visible on mobile (<768px). Has a small close button.
 */
export default function MobileStickyAd() {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [data, setData] = useState<ZoneResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/posto-shpallje')) return;
    fetch(`${API}/ads/zone/mobile-sticky`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const node = ref.current;
    if (!node) { document.documentElement.style.removeProperty('--mobile-ad-height'); return; }
    const resize = new ResizeObserver(() => document.documentElement.style.setProperty('--mobile-ad-height', `${node.getBoundingClientRect().height}px`));
    resize.observe(node);
    return () => { resize.disconnect(); document.documentElement.style.removeProperty('--mobile-ad-height'); };
  }, [data, dismissed, pathname]);

  if (
    dismissed ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/posto-shpallje') ||
    !data ||
    data.ads.length === 0
  ) return null;

  const ad = data.ads[0];

  return (
    <aside aria-label="Reklamë" ref={ref} className="md:hidden fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center bg-white/95 backdrop-blur-sm border-t border-gray-100 px-2 py-1.5">
      <div className="relative flex flex-col items-center w-full max-w-[320px]">
        <div className="flex items-center gap-1.5 self-stretch">
          <p className="text-xs text-gray-400 uppercase tracking-widest flex-1">Reklamë</p>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 w-10 h-10 flex items-center justify-center"
            aria-label="Mbyll reklamën"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <AdBanner ad={ad} width={data.zone.width} height={data.zone.height} />
      </div>
    </aside>
  );
}
