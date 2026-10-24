'use client';

import { usePathname } from 'next/navigation';
import AdBanner from './AdBanner';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ZoneAd {
  id: string;
  title: string;
  imageUrl?: string | null;
  targetUrl: string;
}

interface ZoneResponse {
  zone: { width: number; height: number };
  ads: ZoneAd[];
}

export default function SiteFooterAd() {
  const pathname = usePathname();
  const [data, setData] = useState<ZoneResponse | null>(null);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    fetch(`${API}/ads/zone/site-footer`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [pathname]);

  if (pathname.startsWith('/admin') || !data || data.ads.length === 0) return null;

  return (
    <div className="flex justify-center px-4 py-4 bg-gray-50/50">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-400 uppercase tracking-widest self-start">Reklamë</p>
        {data.ads.map(ad => (
          <AdBanner key={ad.id} ad={ad} width={data.zone.width} height={data.zone.height} />
        ))}
      </div>
    </div>
  );
}
