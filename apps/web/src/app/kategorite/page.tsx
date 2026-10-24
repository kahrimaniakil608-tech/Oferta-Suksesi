export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Të Gjitha Kategoritë — Oferta Suksesi',
  description: 'Shfleto të gjitha kategoritë e shpalljeve në Oferta Suksesi. Patundshmëri, automjete, elektronikë, punë dhe më shumë.',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'patundshmeri':  'Banesa, lokale, toka, garazha — për shitje ose qira.',
  'automjete':     'Vetura, kamionë, motoçikleta dhe pjesë këmbimi.',
  'celular':       'Celularë, tableta dhe aksesorë.',
  'rreth-punes':   'Mundësi punësimi — ofroj punë dhe kërkoj punë.',
  'shtepia-juaj':  'Mobilje, pajisje shtëpiake dhe dekor.',
  'interesi-juaj': 'Hobi, sport, lojëra dhe interesa të ndryshme.',
  'bujqesi':       'Bagëti, pajisje bujqësore dhe produkte.',
  'pc-tv':         'Kompjuterë, televizorë dhe pajisje elektronike.',
  'kafsha':        'Kafshë shtëpiake, bagëti dhe aksesorë.',
  'bashkepunim':   'Mundësi bashkëpunimi dhe investimi.',
  'sherbime':      'Shërbime profesionale dhe zanatçinj.',
  'te-ndryshme':   'Gjithçka tjetër që nuk përshtatet në kategori të tjera.',
};

export default async function KategoritePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-gray-400 flex items-center gap-1.5 mb-3">
          <Link href="/" className="hover:text-accent transition-colors">Fillimi</Link>
          <span>›</span>
          <span className="text-dark font-medium">Kategoritë</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold text-dark">Të Gjitha Kategoritë</h1>
        <p className="text-gray-500 text-sm mt-1">Gjej shpalljet sipas kategorisë që të intereson.</p>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {(await getCategories()).map((cat) => (
          <Link
            key={cat.slug}
            href={`/kategorite/${cat.slug}`}
            className="group flex flex-col items-center text-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5"
          >
            <span className="text-4xl mb-3" role="img" aria-label={cat.name}>
              {cat.icon}
            </span>
            <span className="text-sm font-bold text-dark group-hover:text-accent transition-colors">
              {cat.name}
            </span>
            {CATEGORY_DESCRIPTIONS[cat.slug] && (
              <span className="text-xs text-gray-400 mt-1.5 leading-snug line-clamp-2">
                {CATEGORY_DESCRIPTIONS[cat.slug]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
