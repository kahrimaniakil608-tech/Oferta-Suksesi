import { serverApiFetch } from '@/lib/server-fetch';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ListingCard from '@/components/listings/ListingCard';
import { imgSrc } from '@/lib/utils';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getUserProfile(id: string, page = 1) {
  const res = await serverApiFetch(`${API}/users/${id}/profile?page=${page}&limit=12`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Profili nuk mund të ngarkohet.');
  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getUserProfile(id);
  if (!data) return { title: 'Perdoruesi nuk u gjet' };
  return {
    title: `${data.user.name} — Profili`,
    description: `Shiko shpalljet e ${data.user.name} ne Oferta Suksesi`,
  };
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1');
  const data = await getUserProfile(id, page);
  if (!data) notFound();

  const { user, listings } = data;

  // Canonical URL: if accessed by cuid, the slug is in user.slug
  const canonicalId = user.slug ?? id;

  const memberSince = new Date(user.createdAt).toLocaleDateString('sq-AL', {
    year: 'numeric', month: 'long',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 flex items-center gap-1.5 mb-6">
        <Link href="/" className="hover:text-accent transition-colors">Fillimi</Link>
        <span>›</span>
        <span className="text-dark font-medium">{user.name}</span>
      </nav>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl shrink-0">
            {user.avatarUrl ? (
              <Image
                src={imgSrc(user.avatarUrl)}
                alt={user.name}
                width={64}
                height={64}
                className="rounded-full object-cover w-full h-full"
              />
            ) : (
              user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-dark">{user.name}</h1>
              {user.isVerified && (
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  I verifikuar
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                Anetar qe nga {memberSince}
              </span>
              <span className="flex items-center gap-1">
                <ListIcon className="w-3.5 h-3.5" />
                {user._count.listings} shpallje aktive
              </span>
              <span className="flex items-center gap-1">
                <StarIcon className="w-3.5 h-3.5 text-amber-800" />
                Besueshmeria: {user.trustScore}/100
              </span>
            </div>

            {/* Badges */}
            {user.badges && user.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {user.badges.map((ub: any) => (
                  <span
                    key={ub.badge.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: ub.badge.color + '20', color: ub.badge.color }}
                  >
                    {ub.badge.icon} {ub.badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Listings */}
      <div>
        <h2 className="text-lg font-bold text-dark mb-4">
          Shpalljet e {user.name}
          <span className="text-gray-400 font-normal text-sm ml-1.5">({listings.meta.total})</span>
        </h2>

        {listings.data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {listings.data.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {listings.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-gray-400">
                  Faqja {listings.meta.page} nga {listings.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/perdoruesit/${user.slug ?? id}?page=${page - 1}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Prapa
                    </Link>
                  )}
                  {page < listings.meta.totalPages && (
                    <Link
                      href={`/perdoruesit/${user.slug ?? id}?page=${page + 1}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Para
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-base">Ky perdorues nuk ka shpallje aktive.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
