'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useDisclosure } from '@/hooks/useDisclosure';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalog } from '@/contexts/CatalogContext';

const PUBLIC_LINKS = [{href:'/kompanite',label:'Kompanitë'},{href:'/blog',label:'Blog'},{href:'/redaksia',label:'Redaksia'},{href:'/rreth-nesh',label:'Rreth nesh'},{href:'/kontakti',label:'Kontakti'}];

export default function Navbar() {
  const pathname = usePathname();
  const { categories } = useCatalog();
  const { user, isLoading, logout } = useAuth();

  const { open: isCatOpen, setOpen: setIsCatOpen, containerRef: catRef, triggerRef: catTrigger } = useDisclosure();
  const { open: isUserOpen, setOpen: setIsUserOpen, containerRef: userRef, triggerRef: userTrigger } = useDisclosure();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setIsCatOpen(false); setIsUserOpen(false); setMobileOpen(false); }, [pathname, setIsCatOpen, setIsUserOpen]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const close = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
      <nav
        className="max-w-7xl mx-auto px-4 py-2 min-h-16 flex flex-wrap gap-y-2 items-center justify-between"
        aria-label="Navigimi kryesor"
      >
        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-white.png"
            alt="Oferta Suksesi"
            width={160}
            height={40}
            priority
            className="h-9 sm:h-11 w-auto"
          />
        </Link>

        {/* ── Desktop nav links ─────────────────────────────────────────────── */}
        <div className="hidden md:flex order-3 w-full justify-center xl:order-none xl:w-auto items-center gap-4 text-sm font-medium">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className="py-2 hover:text-white/80 transition-colors aria-[current=page]:underline underline-offset-8">Fillimi</Link>

          {/* Kategoritë dropdown */}
          <div className="relative" ref={catRef}>
            <div className="flex items-center gap-1">
              <Link
                href="/kategorite"
                aria-current={pathname.startsWith("/kategorite") ? "page" : undefined}
                className="hover:text-white/80 transition-colors"
              >
                Kategoritë
              </Link>
              <button
                ref={catTrigger}
                aria-controls="public-categories"
                onClick={() => setIsCatOpen((v) => !v)}
                className="hover:text-white/80 transition-colors p-2"
                aria-expanded={isCatOpen}
                aria-label="Hap listën e kategorive"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isCatOpen && (
              <div id="public-categories" className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white text-dark rounded-xl shadow-xl py-2 grid grid-cols-2 border border-gray-100">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/kategorite/${cat.slug}`}
                    onClick={() => setIsCatOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm transition-colors"
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {PUBLIC_LINKS.map(({href,label}) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined} className="py-2 hover:text-white/80 transition-colors aria-[current=page]:underline underline-offset-8">{label}</Link>)}
        </div>

        {/* ── Right side ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Hap navigimin" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation" onClick={() => setMobileOpen(true)} className="md:hidden rounded-lg border border-white/30 p-2 hover:bg-white/10">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Link
            href="/posto-shpallje"
            className="hidden md:flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Shpallje e Re
          </Link>

          {/* Auth area */}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
          ) : user ? (
            /* ── Logged-in user menu ─────────────────────────────── */
            <div className="relative" ref={userRef}>
              <button
                ref={userTrigger}
                aria-controls="public-account"
                onClick={() => setIsUserOpen((v) => !v)}
                className="flex items-center gap-2 border border-white/30 hover:bg-white/10 pl-1 pr-3 py-1 rounded-full text-sm font-medium transition-colors"
                aria-expanded={isUserOpen}
                aria-label="Menyja e llogarisë"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="hidden sm:inline max-w-20 truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isUserOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserOpen && (
                <div id="public-account" className="absolute right-0 top-full mt-2 w-52 bg-white text-dark rounded-xl shadow-xl border border-gray-100 py-1 text-sm">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-dark truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/paneli"
                    onClick={() => setIsUserOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Paneli Im
                  </Link>
                  <Link
                    href="/paneli/shpalljet"
                    onClick={() => setIsUserOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <ListIcon className="w-4 h-4 text-gray-400" />
                    Shpalljet e Mia
                  </Link>
                  <Link
                    href="/paneli/te-preferuarat"
                    onClick={() => setIsUserOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-4 h-4 text-gray-400 flex items-center justify-center text-xs">♡</span>
                    Të Preferuarat
                  </Link>
                  {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-amber-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Administrimi
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => { logout(); setIsUserOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-red-700 transition-colors"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Dil nga Llogaria
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Guest buttons ──────────────────────────────────── */
            <>
              <Link
                href="/auth/regjistrohu"
                className="hidden sm:flex items-center border border-white/30 hover:bg-white/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Regjistrohu
              </Link>
              <Link
                href="/auth/hyr"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="Hyr në llogarinë tënde"
              >
                <UserIcon className="w-4 h-4" />
                <span>Hyr</span>
              </Link>
            </>
          )}
        </div>
      </nav>
      {mobileOpen && <Modal label="Navigimi i faqes" onClose={() => setMobileOpen(false)} className="w-96">
        <div className="rounded-2xl bg-white p-5 text-dark">
          <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-lg font-bold">Oferta Suksesi</h2><button aria-label="Mbyll navigimin" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">✕</button></div>
          <nav id="public-mobile-navigation" aria-label="Navigimi në celular" className="grid gap-1">
            {[{href:'/',label:'Fillimi'},{href:'/shpallje',label:'Të gjitha shpalljet'},{href:'/kategorite',label:'Kategoritë'},...PUBLIC_LINKS].map(({href,label}) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-gray-50 aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary">{label}</Link>)}
            <Link href="/posto-shpallje" onClick={() => setMobileOpen(false)} className="mt-3 rounded-lg bg-accent px-3 py-3 text-center text-sm font-semibold text-white hover:bg-accent-dark">Posto shpallje</Link>
          </nav>
        </div>
      </Modal>}
    </header>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
