'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type ViewMode = 'grid' | 'list';

export default function ViewToggle({ current }: { current: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'grid') {
      params.delete('view');
    } else {
      params.set('view', mode);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div role="group" aria-label="Pamja e shpalljeve" className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setView('grid')}
        aria-pressed={current === 'grid'}
        aria-label="Pamje kartë"
        className={`p-2.5 focus-visible:outline-offset-[-3px] ${current === 'grid' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-600'}`}
        title="Pamje kartë"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        onClick={() => setView('list')}
        aria-pressed={current === 'list'}
        aria-label="Pamje listë"
        className={`p-2.5 focus-visible:outline-offset-[-3px] ${current === 'list' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-600'}`}
        title="Pamje listë"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}
