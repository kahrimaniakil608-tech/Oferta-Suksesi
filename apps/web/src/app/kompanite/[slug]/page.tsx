import ListingPrice from '@/components/listings/ListingPrice';
import { serverApiFetch } from '@/lib/server-fetch';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { timeAgo, imgSrc, safeUrl } from '@/lib/utils';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface Socials {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
}

interface CompanyData {
  id: string; name: string; slug: string; description?: string;
  phone: string; email: string; website?: string; address?: string;
  logoUrl?: string; coverUrl?: string;
  socials?: Socials | null;
  isVerified: boolean; isPremium: boolean; createdAt: string;
  city?: { name: string };
  owner: { name: string; createdAt: string };
  listings: Array<{
    id: string; slug: string; title: string; createdAt: string; isFeatured: boolean;
    attributes: Record<string, unknown>;
    category?: { name: string }; city?: { name: string };
    images: Array<{ thumbUrl: string }>;
  }>;
  meta: { total: number; page: number; totalPages: number };
}

const SOCIAL_ICONS: Record<string, { label: string; svg: string; color: string }> = {
  facebook:  { label: 'Facebook',    svg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',  color: '#1877F2' },
  instagram: { label: 'Instagram',   svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',  color: '#E1306C' },
  linkedin:  { label: 'LinkedIn',    svg: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',  color: '#0A66C2' },
  tiktok:    { label: 'TikTok',      svg: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',  color: '#000000' },
  youtube:   { label: 'YouTube',     svg: '<path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',  color: '#FF0000' },
  twitter:   { label: 'X / Twitter', svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',  color: '#000000' },
};

async function getCompany(slug: string, page = 1): Promise<CompanyData | null> {
    const res = await serverApiFetch(`${API}/companies/${slug}?page=${page}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Profili i kompanisë nuk mund të ngarkohet.');
    return res.json() as Promise<CompanyData>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) return {};
  return {
    title: company.name,
    description: company.description ?? `Shpallje nga ${company.name} në Oferta Suksesi`,
    alternates: { canonical: `/kompanite/${slug}` },
  };
}

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: requestedPage } = await searchParams;
  const page = /^\d+$/.test(requestedPage ?? '') ? Math.max(1, Math.min(100000, Number(requestedPage))) : 1;
  const company = await getCompany(slug, page);
  if (!company) notFound();
  if (page > Math.max(1, company.meta.totalPages)) redirect(`/kompanite/${encodeURIComponent(slug)}?page=${Math.max(1, company.meta.totalPages)}`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="relative h-40 md:h-56 bg-linear-to-br from-primary to-primary-light overflow-hidden">
        {company.coverUrl && (
          <Image src={imgSrc(company.coverUrl)} alt="" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Logo + header */}
        <div className="flex items-center gap-4 -mt-8 mb-5 relative z-10">
          <div className="w-20 h-20 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden shrink-0 flex items-center justify-center">
            {company.logoUrl ? (
              <Image src={imgSrc(company.logoUrl)} alt={company.name} width={80} height={80} className="object-cover" />
            ) : (
              <span className="text-3xl font-black text-accent">{company.name.charAt(0)}</span>
            )}
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-dark">{company.name}</h1>
              {company.isVerified && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ Verifikuar
                </span>
              )}
              {company.isPremium && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  ⭐ Premium
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 pb-10">
          {/* Sidebar */}
          <aside className="md:col-span-1 space-y-4">
            {/* Contact card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h2 className="font-bold text-dark text-sm">Kontakti</h2>
              <a
                href={`tel:${company.phone}`}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors"
              >
                📞 {company.phone}
              </a>
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                ✉ {company.email}
              </a>
              {safeUrl(company.website) && (
                <a
                  href={safeUrl(company.website)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  🌐 Website
                </a>
              )}
              {company.address && (
                <p className="text-xs text-gray-500 flex gap-2">
                  <span>📍</span> {company.address}
                </p>
              )}

              {/* Social links */}
              {company.socials && Object.entries(company.socials).some(([, v]) => v) && (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Rrjetet Sociale</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(company.socials).map(([key, url]) => {
                      if (!url || !safeUrl(url as string)) return null;
                      const social = SOCIAL_ICONS[key];
                      if (!social) return null;
                      return (
                        <a
                          key={key}
                          href={safeUrl(url as string)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={social.label}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={social.color} dangerouslySetInnerHTML={{ __html: social.svg }} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* About */}
            {company.description && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h2 className="font-bold text-dark text-sm mb-2">Rreth Nesh</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{company.description}</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Anëtar që nga {new Date(company.createdAt).getFullYear()}</p>
              <p className="text-xs text-gray-400 mt-1">{company.meta.total} shpallje gjithsej</p>
            </div>
          </aside>

          {/* Listings */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="font-bold text-dark">
              Shpalljet ({company.meta.total})
            </h2>

            {company.listings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
                Nuk ka shpallje aktive.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/shpalljet/${l.slug}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-4/3 bg-gray-100">
                      {l.images[0] ? (
                        <Image
                          src={imgSrc(l.images[0].thumbUrl)}
                          alt={l.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
                      )}
                      {l.isFeatured && (
                        <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          E veçuar
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-dark truncate">{l.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {l.category?.name} · {l.city?.name}
                      </p>
                      <ListingPrice attributes={l.attributes} />
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(l.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {company.meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                {Array.from({ length: company.meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/kompanite/${slug}?page=${p}`}
                    aria-label={`Faqja ${p}`}
                    aria-current={p === company.meta.page ? 'page' : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === company.meta.page
                        ? 'bg-accent text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
