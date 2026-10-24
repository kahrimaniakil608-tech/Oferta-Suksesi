'use client';

import Modal from '@/components/ui/Modal';
import Image from 'next/image';
import { imgSrc } from '@/lib/utils';
import { useState, useRef } from 'react';
import type { ListingImage } from '@/lib/api';

interface ImageGalleryProps {
  images: ListingImage[];
  title: string;
}



export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
        <PhotoIcon className="w-12 h-12" />
        <span className="text-sm">Nuk ka foto</span>
      </div>
    );
  }

  function scrollToIndex(index: number) {
    setActive(index);
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActive(index);
  }

  return (
    <div>
      {expanded && <Modal label={`Fotot: ${title}`} onClose={() => { setExpanded(false); setZoom(false); }} className="w-[95vw] max-w-6xl bg-white rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-3 mb-3"><span role="status">Foto {active + 1} / {images.length}</span><button onClick={() => setZoom(v => !v)} aria-pressed={zoom} className="border rounded px-3 py-2">{zoom ? 'Zvogëlo' : 'Zmadho'}</button><button className="ml-auto border rounded px-3 py-2" onClick={() => setExpanded(false)}>Mbyll</button></div>
        <div className="overflow-auto max-h-[65dvh]" tabIndex={0} aria-label="Fotografia; lëvizni për ta parë kur është zmadhuar" onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); setActive(i => (i+1)%images.length); } if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(i => (i+images.length-1)%images.length); } }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc(images[active].url)} alt={images[active].altText ?? `${title} — foto ${active+1}`} style={{maxWidth: zoom ? 'none' : '100%', width: zoom ? '180%' : '100%', maxHeight: zoom ? 'none' : '65dvh', objectFit: 'contain'}} />
        </div>
        <div className="flex justify-between mt-3"><button disabled={images.length < 2} onClick={() => setActive(i => (i+images.length-1)%images.length)}>← Foto e mëparshme</button><button disabled={images.length < 2} onClick={() => setActive(i => (i+1)%images.length)}>Foto tjetër →</button></div>
      </Modal>}
      <button className="mb-2 text-sm font-semibold text-primary underline py-2" onClick={() => setExpanded(true)}>Hap fotot në madhësi të plotë</button>
      {/* Main slide container */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          ref={scrollRef}
          tabIndex={0} aria-label={`Fotot e shpalljes: ${title}`}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] shrink-0 w-full snap-start"
            >
              <Image
                src={failed[img.url] ? '/images/placeholder.svg' : imgSrc(img.url)}
                unoptimized onError={() => setFailed(old => ({ ...old, [img.url]: true }))}
                alt={img.altText ?? `${title} — fotografia ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 55vw"
              />
            </div>
          ))}
        </div>

        {/* Prev / Next arrows (desktop) */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => scrollToIndex(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label="Foto e mëparshme"
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full items-center justify-center transition-colors disabled:opacity-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToIndex(Math.min(images.length - 1, active + 1))}
              disabled={active === images.length - 1}
              aria-label="Foto tjetër"
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full items-center justify-center transition-colors disabled:opacity-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 mt-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Foto ${i + 1}`}
              aria-pressed={i === active}
              className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                i === active
                  ? 'border-accent ring-1 ring-accent'
                  : 'border-transparent opacity-55 hover:opacity-100'
              }`}
            >
              <Image
                src={failed[img.url] ? '/images/placeholder.svg' : imgSrc(img.thumbUrl || img.url)}
                unoptimized onError={() => setFailed(old => ({ ...old, [img.url]: true }))}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z" />
    </svg>
  );
}
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
