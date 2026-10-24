'use client';

import { usePathname } from 'next/navigation';
import AdBanner from './AdBanner';
import AdRotator from './AdRotator';
import { useEffect, useState } from 'react';

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
  zone: { width: number; height: number; rotationInterval?: number };
  ads: ZoneAd[];
}

/**
 * Sticky 160×600 skyscraper ads on the left/right side of the page.
 * Only visible on very wide screens (≥1440px) so they don't overlap content.
 * Hidden on admin pages.
 */
export default function SideSkyscraper() {
  const pathname = usePathname();
  const [left, setLeft] = useState<ZoneResponse | null>(null);
  const [right, setRight] = useState<ZoneResponse | null>(null);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    fetch(`${API}/ads/zone/sidebar-skyscraper-left`)
      .then(r => r.ok ? r.json() : null)
      .then(setLeft)
      .catch(() => {});

    fetch(`${API}/ads/zone/sidebar-skyscraper-right`)
      .then(r => r.ok ? r.json() : null)
      .then(setRight)
      .catch(() => {});
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const hasLeft = left && left.ads.length > 0;
  const hasRight = right && right.ads.length > 0;
  if (!hasLeft && !hasRight) return null;

  const renderZone = (data: ZoneResponse) => {
    const { zone, ads } = data;
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Reklamë</p>
        {ads.length === 1 ? (
          <AdBanner ad={ads[0]} width={zone.width} height={zone.height} />
        ) : (
          <AdRotator
            ads={ads}
            width={zone.width}
            height={zone.height}
            interval={zone.rotationInterval ?? 5}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {hasLeft && (
        <div className="hidden 2xl:block fixed left-2 top-1/2 -translate-y-1/2 z-30">
          {renderZone(left!)}
        </div>
      )}
      {hasRight && (
        <div className="hidden 2xl:block fixed right-2 top-1/2 -translate-y-1/2 z-30">
          {renderZone(right!)}
        </div>
      )}
    </>
  );
}
