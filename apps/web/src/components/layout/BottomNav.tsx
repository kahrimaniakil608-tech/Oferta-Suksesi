'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
        active ? 'text-accent' : 'text-gray-400'
      }`}
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="text-xs font-medium leading-tight max-w-16 text-center">
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
      aria-label="Navigimi i poshtëm"
    >
      <div className="flex items-center justify-around h-16 px-2">
        <NavItem
          href="/"
          label="Fillimi"
          active={pathname === '/'}
          icon={<HomeIcon />}
        />
        <NavItem
          href="/kategorite"
          label="Kategoritë"
          active={pathname.startsWith('/kategorite')}
          icon={<GridIcon />}
        />

        {/* Center elevated post button */}
        <Link
          href="/posto-shpallje"
          aria-label="Posto shpallje të re"
          className="flex flex-col items-center -mt-4"
        >
          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg">
            <PlusIcon className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-semibold text-accent mt-0.5 leading-tight">Posto</span>
        </Link>

        <NavItem
          href="/paneli/te-preferuarat"
          label="Të Preferuarat"
          active={pathname.startsWith('/paneli/te-preferuarat')}
          icon={<HeartIcon />}
        />
        <NavItem
          href="/paneli"
          label="Paneli"
          active={pathname.startsWith('/paneli') && !pathname.startsWith('/paneli/te-preferuarat')}
          icon={<UserIcon />}
        />
      </div>
    </nav>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V13h6v8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-full h-full">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
