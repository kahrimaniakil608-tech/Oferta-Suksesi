'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface FeaturedCarouselProps {
  children: ReactNode;
}

export default function FeaturedCarousel({ children }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(':scope > *')?.clientWidth ?? 250;
    const distance = cardWidth + 12; // gap-3 = 12px
    el.scrollBy({ left: dir === 'left' ? -distance : distance, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-accent transition-all -ml-3 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 md:group-focus-within/carousel:opacity-100 focus-visible:opacity-100"
          aria-label="Lëviz majtas"
        >
          <ChevronIcon direction="left" />
        </button>
      )}

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="grid grid-flow-col auto-cols-[calc((100%-12px)/2)] sm:auto-cols-[calc((100%-24px)/3)] md:auto-cols-[calc((100%-36px)/4)] xl:auto-cols-[calc((100%-48px)/5)] gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide p-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-accent transition-all -mr-3 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 md:group-focus-within/carousel:opacity-100 focus-visible:opacity-100"
          aria-label="Lëviz djathtas"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      className={`w-4 h-4 ${direction === 'left' ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
