import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Faqja nuk u gjet — 404',
};

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* Illustration */}
        <div className="relative mx-auto mb-8 w-48 h-48">
          <div className="absolute inset-0 rounded-full bg-accent/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-black text-accent select-none">
              404
            </span>
          </div>
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent/60 animate-bounce" />
          <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary-light/50 animate-bounce [animation-delay:0.3s]" />
          <div className="absolute top-4 -left-4 w-2 h-2 rounded-full bg-accent/40 animate-bounce [animation-delay:0.6s]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-dark mb-3">
          Faqja nuk u gjet
        </h1>

        <p className="text-gray-500 mb-10 leading-relaxed max-w-md mx-auto">
          Faqja që po kërkoni nuk ekziston, mund të jetë zhvendosur ose fshirë.
          Provoni njërën nga opsionet më poshtë.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-dark transition-colors shadow-sm w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
            </svg>
            Kthehu në Fillim
          </Link>

          <Link
            href="/kerko"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-accent font-semibold rounded-xl border-2 border-accent/20 hover:border-accent hover:bg-accent/5 transition-colors w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Kërko Shpallje
          </Link>
        </div>

        {/* Quick links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/kategorite/patundshmeri" icon="building" label="Patundshmëri" />
          <QuickLink href="/kategorite/automjete" icon="car" label="Automjete" />
          <QuickLink href="/kompanite" icon="briefcase" label="Kompani" />
          <QuickLink href="/kontakti" icon="mail" label="Kontakti" />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            Nëse mendoni se kjo është gabim,{' '}
            <Link href="/kontakti" className="text-accent underline hover:no-underline">
              na kontaktoni
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-accent/20 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
        <QuickIcon name={icon} />
      </div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-accent transition-colors">
        {label}
      </span>
    </Link>
  );
}

function QuickIcon({ name }: { name: string }) {
  const cls = 'w-5 h-5 text-gray-400 group-hover:text-accent transition-colors';
  switch (name) {
    case 'building':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
      );
    case 'car':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M3.375 14.25h.008M17.25 14.25h.008M6.75 10.5h10.5l1.5-4.5H5.25l1.5 4.5z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
    case 'mail':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    default:
      return null;
  }
}
