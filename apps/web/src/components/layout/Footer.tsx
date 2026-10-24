'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useCatalog } from '@/contexts/CatalogContext';

export default function Footer() {
  const pathname = usePathname();
  const { categories } = useCatalog();

  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-dark text-gray-300 pt-12 pb-[calc(96px+env(safe-area-inset-bottom)+var(--mobile-ad-height,0px))] md:pb-6 px-4 mt-2">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-2 md:col-span-1">
          <a href="/" className="inline-block mb-3">
            <Image
              src="/logo-white.png"
              alt="Oferta Suksesi"
              width={140}
              height={35}
              className="h-14 w-auto"
            />
          </a>
          <p className="text-sm text-gray-300 leading-relaxed">
            Platforma kryesore e shpalljeve të klasifikuara në Kosovë.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Lidhje
          </h2>
          <ul className="space-y-2 text-sm">
            {([['Rreth Nesh', '/rreth-nesh'], ['Redaksia', '/redaksia'], ['Kontakti', '/kontakti'], ['Kushtet e Përdorimit', '/kushtet-e-perdorimit'], ['Politika e Privatësisë', '/politikat-e-privatesise'], ['Pyetjet e Shpeshta', '/pyetjet-e-shpeshta']] as const).map(([label, href]) => (
              <li key={href}>
                <a href={href} className="hover:text-white transition-colors">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Kategoritë
          </h2>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 6).map((cat) => (
              <li key={cat.slug}>
                <a href={`/kategorite/${cat.slug}`} className="hover:text-white transition-colors">
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Kontakti
          </h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <a href="mailto:info@ofertasuksesi.com" className="break-all hover:text-white transition-colors">
                info@ofertasuksesi.com
              </a>
            </li>
            <li>
              <a href="tel:+38344506850" className="hover:text-white transition-colors">
                +383 44 50 68 50
              </a>
            </li>
            <li>Murat Mehmeti 7, Tophane</li>
            <li>Prishtinë, Kosovë 10000</li>
          </ul>
          <div className="flex gap-3 mt-4">
            <a href="https://www.facebook.com/OfertaSuksesi1996" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.instagram.com/ofertasuksesi1996/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://x.com/ofertasuksesi96" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-gray-300 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-gray-700 text-center text-xs text-gray-300">
        &copy; {new Date().getFullYear()} OFERTASUKSESI.COM &mdash; Të gjitha të drejtat e rezervuara. Mundësuar nga{' '}
        <a href="https://porositweb.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
          Porosit Web
        </a>
      </div>
    </footer>
  );
}
