'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Kryesore',
    items: [
      { href: '/paneli',                label: 'Ballina',         icon: '⊞' },
      { href: '/paneli/shpalljet',      label: 'Shpalljet e Mia', icon: '📋' },
      { href: '/paneli/te-preferuarat', label: 'Të Preferuarat',  icon: '♡' },
    ],
  },
  {
    label: 'Performanca',
    items: [
      { href: '/paneli/analitika', label: 'Analitika', icon: '📊' },
      { href: '/paneli/pagesat',   label: 'Pagesat',   icon: '💳' },
    ],
  },
  {
    label: 'Llogaria',
    items: [
      { href: '/paneli/cilesimet', label: 'Cilësimet', icon: '⚙' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap(g => g.items);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/hyr?redirect=' + encodeURIComponent(pathname));
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-lg font-bold text-dark">Paneli Im</p>
          <p className="text-sm text-gray-500">{user.name}</p>
        </div>

        <label className="md:hidden block mb-5 text-sm font-semibold">
          Menuja e llogarisë
          <select className="block w-full mt-2 border rounded-lg bg-white p-3" value={NAV.find(item => item.href === pathname)?.href ?? '/paneli'} onChange={event => router.push(event.target.value)}>
            {NAV.map(item => <option key={item.href} value={item.href}>{item.label}</option>)}
          </select>
        </label>

        <div className="flex gap-6">
          {/* Sidebar — desktop only */}
          <aside className={`hidden md:block shrink-0 transition-all duration-200 ${collapsed ? 'w-12' : 'w-52'}`}>
            <nav aria-label="Llogaria ime" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-28 xl:top-20">
              {/* Collapse toggle */}
              <button
                onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-end px-3 py-2 border-b border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title={collapsed ? 'Zgjero' : 'Mbylle'}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Create listing CTA */}
              <div className="px-3 py-3 border-b border-gray-100">
                <Link
                  href="/posto-shpallje"
                  title={collapsed ? 'Krijo Shpallje' : undefined}
                  className={`flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-white text-sm font-semibold py-2 hover:bg-accent-dark transition-colors ${collapsed ? 'px-0' : 'px-3'}`}
                >
                  <span className="text-base leading-none">+</span>
                  {!collapsed && 'Krijo Shpallje'}
                </Link>
              </div>

              {/* Grouped nav */}
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? 'border-t border-gray-100' : ''}>
                  {!collapsed && (
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {group.label}
                    </p>
                  )}
                  {group.items.map(({ href, label, icon }) => {
                    const active = href === '/paneli' ? pathname === '/paneli' : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        aria-label={label}
                        title={collapsed ? label : undefined}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-primary/5 text-primary border-l-2 border-l-primary'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base shrink-0">{icon}</span>
                        {!collapsed && label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <section aria-label="Përmbajtja e llogarisë" className="flex-1 min-w-0">{children}</section>
        </div>
      </div>
    </div>
  );
}
