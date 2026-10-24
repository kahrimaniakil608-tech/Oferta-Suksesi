import { serverApiFetch } from '@/lib/server-fetch';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/utils';
import AdZone from '@/components/ads/AdZone';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  isVerified: boolean;
  isPremium: boolean;
  city?: { name: string } | null;
  _count: { listings: number };
}

async function getCompanies(page: number, q: string): Promise<{ data: Company[]; meta: { total: number; totalPages: number } }> {
  const res = await serverApiFetch(`${API}/companies?page=${page}&limit=24&q=${encodeURIComponent(q)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('Kompanitë nuk mund të ngarkohen. Provoni përsëri.');
  return res.json();
}

export const metadata: Metadata = {
  title: 'Kompanite — Oferta Suksesi',
  description: 'Shfleto kompanitë e besuar në Oferta Suksesi',
};

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const page = /^\d+$/.test(params.page ?? '') ? Math.max(1, Math.min(1000000, Number(params.page))) : 1;
  const q = params.q ?? '';
  const { data: companies, meta } = await getCompanies(page, q);
  const pageUrl = (p: number) => `/kompanite?${new URLSearchParams({ q, page: String(p) })}`;

  const premium = companies.filter((c) => c.isPremium);
  const regular = companies.filter((c) => !c.isPremium);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-linear-to-br from-primary-dark to-primary-light text-white py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Kompani të Besuara</h1>
          <p className="text-green-200 text-sm md:text-base">
            Gjej bizneset dhe kompanitë më të mira në Kosovë
          </p>
        </div>
      </section>

      {/* Ad banner under header */}
      <div className="flex justify-center px-4 py-3 bg-gray-50/50">
        <AdZone slug="companies-top" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <form action="/kompanite" className="flex gap-2 mb-5"><label htmlFor="company-search" className="sr-only">Kërko kompani</label><input id="company-search" name="q" defaultValue={q} placeholder="Kërko kompani" className="border rounded p-2 flex-1" /><button className="p-2 rounded bg-primary text-white">Kërko</button></form>
        <p className="mb-4">{meta.total} kompani</p>
        {/* Premium Section */}
        {premium.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-amber-800 text-lg">⭐</span>
              <h2 className="text-lg font-bold text-dark">Kompani Premium</h2>
              <span className="text-xs text-gray-400 ml-1">({premium.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {premium.map((c) => (
                <CompanyCard key={c.id} company={c} featured />
              ))}
            </div>
          </div>
        )}

        {/* Ad between sections */}
        <div className="flex justify-center my-4">
          <AdZone slug="companies-inline" labeled />
        </div>

        {/* All Companies */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-lg font-bold text-dark">Të gjitha Kompanitë</h2>
            <span className="text-xs text-gray-400">({regular.length})</span>
          </div>

          {companies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
              <p className="text-gray-400 text-sm">Nuk u gjetën kompani për këtë kërkim.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regular.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
          )}
        </div>
        <nav aria-label="Faqet e kompanive" className="flex justify-between mt-6">{page > 1 && <Link href={pageUrl(page-1)}>← Para</Link>}<span>Faqja {page} / {Math.max(1,meta.totalPages)}</span>{page < meta.totalPages && <Link href={pageUrl(page+1)}>Tjetër →</Link>}</nav>
      </div>
    </div>
  );
}

function CompanyCard({ company: c, featured }: { company: Company; featured?: boolean }) {
  const cover = c.coverUrl ? imgSrc(c.coverUrl) : null;
  const logo = c.logoUrl ? imgSrc(c.logoUrl) : null;

  return (
    <Link
      href={`/kompanite/${c.slug}`}
      className={`group bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
        featured ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
      }`}
    >
      {/* Cover */}
      <div className="relative h-28 bg-linear-to-br from-primary/80 to-primary-light/80 overflow-hidden">
        {cover ? (
          <Image src={cover} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-primary-light/30" />
        )}
        <div className="absolute inset-0 bg-black/10" />
        {featured && (
          <span className="absolute top-2 right-2 bg-amber-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ⭐ Premium
          </span>
        )}
      </div>

      {/* Logo + Info */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-3 -mt-6 mb-3 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden shrink-0 flex items-center justify-center">
            {logo ? (
              <Image src={logo} alt={c.name} width={56} height={56} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-xl font-black text-accent">{c.name.charAt(0)}</span>
            )}
          </div>
          <div className="pb-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-dark truncate group-hover:text-accent transition-colors">
                {c.name}
              </h3>
              {c.isVerified && (
                <span className="shrink-0 text-blue-700 text-xs" title="Verifikuar">✓</span>
              )}
            </div>
            {c.city && (
              <p className="text-xs text-gray-400">{c.city.name}</p>
            )}
          </div>
        </div>

        {c.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{c.description}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {c._count.listings} {c._count.listings === 1 ? 'shpallje' : 'shpallje'}
          </span>
          <span className="text-xs text-accent font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            Shiko profilin →
          </span>
        </div>
      </div>
    </Link>
  );
}
