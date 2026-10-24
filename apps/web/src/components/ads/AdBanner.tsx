'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { imgSrc, safeUrl } from '@/lib/utils';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
export interface AdData { id: string; title: string; adType?: string; imageUrl?: string | null; embedCode?: string | null; targetUrl: string }
interface Props { ad: AdData; width: number; height: number; pageUrl?: string }
export default function AdBanner({ ad, width, height, pageUrl }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setLoaded(false); setFailed(false); }, [ad.id, ad.imageUrl]);
  useEffect(() => {
    if (!loaded || !ref.current || ad.adType === 'EMBED_CODE') return;
    let visible = false, sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (visible && !document.hidden && !sent) timer = setTimeout(() => {
        sent = true;
        void fetch(`${API}/ads/${ad.id}/impression`, { method: 'POST', keepalive: true, signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageUrl: pageUrl ?? location.pathname }) }).catch(() => {});
      }, 1000);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= 0.5; schedule(); }, { threshold: [0,0.5] });
    observer.observe(ref.current); document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', schedule); };
  }, [ad.id, ad.adType, loaded, pageUrl]);
  // Arbitrary provider code is unsupported until its CSP integration is reviewed.
  if (ad.adType === 'EMBED_CODE' || !ad.imageUrl || failed) return null;
  return <a ref={ref} href={safeUrl(ad.targetUrl) ?? '#'} target="_blank" rel="noopener noreferrer sponsored" aria-label={ad.title}
    onClick={() => { void fetch(`${API}/ads/${ad.id}/click`, { method: 'POST', keepalive: true, signal: AbortSignal.timeout(5000) }).catch(() => {}); }}
    className="block overflow-hidden rounded-lg w-full" style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}>
    <Image src={imgSrc(ad.imageUrl)} alt={ad.title} width={width} height={height} className="w-full h-full object-cover" unoptimized onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
  </a>;
}
