'use client';
import { statusLabel } from '@/lib/labels';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  indent?: boolean;
  isActive?: (p: string) => boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/admin', label: 'Përmbledhja', icon: <GridIcon />, isActive: p => p === '/admin' },
    ],
  },
  {
    label: 'Shpalljet',
    items: [
      { href: '/admin/shpalljet',  label: 'Shpalljet',  icon: <ListIcon /> },
      { href: '/admin/operacionet', label: 'Radha e punës', icon: <ShieldIcon /> },
      { href: '/admin/moderimi',   label: 'Moderimi',   icon: <ShieldIcon /> },
      { href: '/admin/kompanite',   label: 'Kompanitë',   icon: <BuildingIcon /> },
    ],
  },
  {
    label: 'Komuniteti',
    items: [
      { href: '/admin/perdoruesit', label: 'Përdoruesit', icon: <UsersIcon /> },
      { href: '/admin/badges',      label: 'Etiketat',      icon: <BadgeIcon /> },
    ],
  },
  {
    label: 'Reklamat',
    items: [
      { href: '/admin/reklamat', label: 'Kampanjat', icon: <MegaphoneIcon />, isActive: p => p.startsWith('/admin/reklamat') && !p.startsWith('/admin/reklamat/zonat') },
      { href: '/admin/reklamat/zonat', label: 'Zonat', icon: <LayoutIcon />, isActive: p => p.startsWith('/admin/reklamat/zonat') },
    ],
  },
  {
    label: 'Përmbajtja',
    items: [
      { href: '/admin/blog', label: 'Blog', icon: <BlogIcon />, isActive: p => p.startsWith('/admin/blog') && !p.startsWith('/admin/blog/kategorite') },
      { href: '/admin/blog/kategorite', label: 'Kategoritë e Blogit', icon: <TagIcon />, isActive: p => p.startsWith('/admin/blog/kategorite') },
    ],
  },
  {
    label: 'Sistemi',
    items: [
      { href: '/admin/qytetet',    label: 'Qytetet',    icon: <MapPinIcon /> },
      { href: '/admin/kategorite', label: 'Kategoritë', icon: <TagIcon /> },
      { href: '/admin/eksportet',  label: 'Eksportet',  icon: <DownloadIcon /> },
      { href: '/admin/cilesimet', label: 'Cilësimet', icon: <SettingsIcon /> },
    ],
  },
];

const CRUMBS: Record<string, string> = {
  admin:        'Përmbledhja',
  shpalljet:    'Shpalljet',
  shpallje:     'Shpalljet',

  perdoruesit:  'Përdoruesit',
  operacionet: 'Radha e punës',
  moderimi:     'Moderimi',
  kategorite:   'Kategoritë',
  qytetet:      'Qytetet',
  kompanite:    'Kompanitë',
  reklamat:     'Reklamat',
  zonat:        'Zonat',
  badges:       'Etiketat',
  eksportet:    'Eksportet',
  cilesimet:    'Cilësimet',
  blog:         'Blog',
  'e-re':       'E Re',
  new:          'E Re',
};

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: CRUMBS[seg] ?? 'Detajet',
    href:  '/' + segments.slice(0, i + 1).join('/'),
    last:  i === segments.length - 1,
  }));

  return (
    <nav aria-label="Vendndodhja" className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300">/</span>}
          {c.last ? (
            <span aria-current="page" className="text-gray-700 font-semibold">{c.label}</span>
          ) : (
            <Link href={c.href} className="text-gray-400 hover:text-gray-600 transition-colors">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [open,        setOpen]        = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const { open: profileOpen, setOpen: setProfileOpen, containerRef: profileRef, triggerRef: profileTrigger } = useDisclosure();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { setProfileOpen(false); setSearchOpen(false); }, [pathname, setProfileOpen]);

  function handleHeaderSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = headerSearch.trim();
    if (!q) return;
    router.push(`/admin/shpalljet?search=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR'))) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'MODERATOR' && pathname === '/admin') router.replace('/admin/moderimi');
    const media = window.matchMedia('(min-width: 768px)');
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, [user?.role, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role === 'MODERATOR' && pathname === '/admin') return <p role="status">Po hapet radha e moderimit…</p>;

  const allowed = (path: string) => user.role === 'ADMIN' || ['/admin/shpalljet', '/admin/moderimi', '/admin/operacionet'].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  const navigation = NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(item => allowed(item.href)) })).filter(group => group.items.length);

  const sidebar = (
      <aside id="admin-navigation"
        className={`shrink-0 md:sticky top-0 h-dvh bg-[#1B3A2D] flex flex-col z-50 transition-all duration-200 md:translate-x-0 ${
          open ? 'flex' : 'hidden md:flex'
        } ${collapsed && !open ? 'w-16' : 'w-60'}`}
      >
        <div className={`h-16 flex items-center border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-2.5 justify-between'}`}>
          {open && <button aria-label="Mbyll menynë" onClick={() => setOpen(false)} className="text-white p-2 md:hidden">✕</button>}
          {(!collapsed || open) && (
            <Link href="/">
              <Image
                src="/logo-white.png"
                alt="Oferta Suksesi"
                width={160}
                height={40}
                className="h-9 w-auto"
              />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden md:flex items-center justify-center"
            aria-label={collapsed ? 'Zgjero menynë' : 'Ngushto menynë'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Zgjero menynë' : 'Ngushto menynë'}
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
          </button>
        </div>

        <nav aria-label="Administrimi" className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden">
          {navigation.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && (!collapsed || open) && (
                <p className="px-2.5 mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-auto mb-2 w-4 border-t border-white/10" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon, indent, isActive }) => {
                  const active = isActive ? isActive(pathname) : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      aria-label={label}
                      title={collapsed ? label : undefined}
                      className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        collapsed && !open ? 'justify-center px-2.5' : indent ? 'pl-7 pr-2.5' : 'px-2.5'
                      } ${
                        active
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="w-4 h-4 shrink-0" aria-hidden="true">{icon}</span>
                      {(!collapsed || open) && label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`py-3 border-t border-white/10 shrink-0 ${collapsed ? 'px-1.5 flex flex-col items-center gap-2' : 'px-3'}`}>
          {(!collapsed || open) && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
                <p className="text-xs text-white/80 uppercase tracking-wide">{statusLabel(user.role)}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            aria-label="Dil nga llogaria" title="Dil nga llogaria"
            className={`flex items-center gap-1.5 rounded-md text-xs text-white/80 hover:bg-red-700/20 hover:text-red-300 transition-colors ${collapsed ? 'p-2' : 'w-full px-2 py-1.5'}`}
          >
            <LogoutIcon className="w-3 h-3 shrink-0" />
            {(!collapsed || open) && 'Dil nga llogaria'}
          </button>
        </div>
      </aside>
  );

  return (
    <div className="admin-workspace flex min-h-screen bg-[#f4f6f8]" style={{ '--color-primary': '#AD4C0C', '--color-primary-dark': '#873A08', '--color-primary-light': '#AD4C0C' } as React.CSSProperties}>


      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      {open ? <Modal label="Menuja e administrimit" onClose={() => setOpen(false)} className="ml-0 my-0 h-dvh max-h-dvh w-64 md:hidden">{sidebar}</Modal> : sidebar}

      {/* ── Main column ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 sticky top-0 z-30 shrink-0">
          <button
            aria-label="Hap menynë" aria-expanded={open} aria-controls="admin-navigation"
            onClick={() => setOpen(true)}
            className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <HamburgerIcon className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <Breadcrumbs pathname={pathname} />
          </div>

          <Link href="/admin/shpalljet/new"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Shpallje e Re
          </Link>

          <ValidatedForm onSubmit={handleHeaderSearch} className="hidden sm:flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 w-52">
            <SearchIcon className="w-3 h-3 text-gray-400 shrink-0" />
            <input
              type="text"
              aria-label="Kërko shpallje në administrim"
              value={headerSearch}
              onChange={e => setHeaderSearch(e.currentTarget.value)}
              placeholder="Kërko titull, autor, tel…"
              className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-full"
            />
          </ValidatedForm>

          <button type="button" aria-label="Hap kërkimin në administrim" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)} className="sm:hidden rounded-lg border border-gray-200 p-2 text-gray-600"><SearchIcon className="size-5" /></button>
          <div className="relative" ref={profileRef}>
            <button
              ref={profileTrigger} aria-controls="admin-account-menu" aria-label="Menuja e llogarisë" aria-expanded={profileOpen}
              onClick={() => setProfileOpen(v => !v)}
              className="w-10 h-10 rounded-full bg-[#1B3A2D] flex items-center justify-center text-white text-xs font-bold shrink-0 hover:ring-2 hover:ring-primary/30 transition-all"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            {profileOpen && (
              <>
                <div id="admin-account-menu" className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-dark truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {statusLabel(user.role)}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href={`/perdoruesit/${user.slug ?? user.id}`}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                      Profili im
                    </Link>
                    <Link
                      href={user.role === "ADMIN" ? `/admin/perdoruesit/${user.id}` : "/paneli/cilesimet"}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <SettingsSmallIcon className="w-3.5 h-3.5 text-gray-400" />
                      Menaxho llogarinë
                    </Link>
                    <Link
                      href="/"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400" />
                      Shiko faqen publike
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors w-full"
                    >
                      <LogoutIcon className="w-3.5 h-3.5" />
                      Dil nga llogaria
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {searchOpen && <Modal label="Kërko në administrim" onClose={() => setSearchOpen(false)} className="w-96">
          <div className="bg-white rounded-2xl p-5">
            <div className="flex justify-between items-center gap-3 mb-4"><h2 className="text-lg font-semibold">Kërko shpallje</h2><button aria-label="Mbyll kërkimin" onClick={() => setSearchOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">✕</button></div>
            <ValidatedForm onSubmit={event => { handleHeaderSearch(event); if (headerSearch.trim()) setSearchOpen(false); }} className="space-y-3">
              <label className="block text-sm font-medium">Titull, autor ose telefon<input type="search" value={headerSearch} onChange={event => setHeaderSearch(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 p-3" /></label>
              <button type="submit" className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-dark">Kërko</button>
            </ValidatedForm>
          </div>
        </Modal>}
        <section aria-label="Përmbajtja e administrimit" className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {allowed(pathname) ? children : <div role="alert" className="p-6 rounded-xl bg-white">Kjo faqe kërkon të drejta administratori. <Link className="underline" href="/admin/moderimi">Hap moderimin</Link></div>}
          </div>
        </section>

        <footer className="py-2 text-center text-xs text-gray-400 border-t border-gray-200 bg-white shrink-0">
          &copy; {new Date().getFullYear()} OFERTASUKSESI.COM &mdash; Të gjitha të drejtat e rezervuara. Mundësuar nga{' '}
          <a href="https://porositweb.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Porosit Web
          </a>
        </footer>
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────────
function GridIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
function LayoutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}
function BadgeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function SettingsSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function BlogIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}
