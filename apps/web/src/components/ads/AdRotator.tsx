'use client';
import { useEffect, useRef, useState } from 'react';
import AdBanner, { type AdData } from './AdBanner';
interface Props { ads: AdData[]; width: number; height: number; interval: number }
export default function AdRotator({ ads, width, height, interval }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(ref.current); return () => observer.disconnect();
  }, [ads.length]);
  useEffect(() => {
    if (ads.length < 2 || paused || interacting || !visible) return;
    const timer = setInterval(() => { if (!document.hidden) setActive(i => (i+1)%ads.length); }, Math.max(3,interval)*1000);
    return () => clearInterval(timer);
  }, [ads.length, interval, paused, interacting, visible]);
  if (!ads.length) return null;
  const index = active % ads.length;
  return <div ref={ref} className="relative overflow-hidden" style={{ maxWidth: width }} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
    <AdBanner key={ads[index].id} ad={ads[index]} width={width} height={height} />
    {ads.length > 1 && <div className="flex justify-center gap-2 mt-1.5 items-center">
      {ads.map((ad,i) => <button key={ad.id} onClick={() => setActive(i)} aria-label={`Reklama ${i+1}`} aria-pressed={i === index} className={`w-6 h-6 rounded-full border ${i === index ? 'bg-accent' : 'bg-gray-200'}`} />)}
      <button className="text-xs underline px-2 py-1" onClick={() => setPaused(p => !p)}>{paused ? 'Vazhdo' : 'Ndalo'}</button>
    </div>}
  </div>;
}
