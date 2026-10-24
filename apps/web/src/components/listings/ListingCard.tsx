import ListingPrice from '@/components/listings/ListingPrice';
import Image from 'next/image';
import Link from 'next/link';
import { timeAgo, imgSrc as toImgSrc } from '@/lib/utils';
import type { Listing } from '@/lib/api';

interface ListingCardProps {
  listing: Listing;
  variant?: 'grid' | 'list';
}

export default function ListingCard({ listing, variant = 'grid' }: ListingCardProps) {
  const { title, attributes, city, createdAt, viewsCount, isFeatured, isUrgent, images } = listing;

  const primaryImage = images?.[0];
  const imgSrc = primaryImage?.thumbUrl ? toImgSrc(primaryImage.thumbUrl) : primaryImage?.url ? toImgSrc(primaryImage.url) : null;

  if (variant === 'list') {
    return (
      <Link
        href={`/shpalljet/${listing.slug}`}
        className={`group flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
          isFeatured ? 'border border-accent' : 'border border-gray-200'
        }`}
      >
        {/* Thumbnail */}
        <div className="relative w-28 sm:w-52 h-28 sm:h-36 shrink-0 bg-gray-100 overflow-hidden">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={primaryImage?.altText ?? title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlaceholderIcon className="w-10 h-10 text-gray-300" />
            </div>
          )}

          <ListingBadges featured={isFeatured} urgent={isUrgent} />
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1 min-w-0 justify-center">
          <h2 className="text-sm sm:text-base font-semibold text-dark line-clamp-2 group-hover:text-accent transition-colors leading-snug">
            {title}
          </h2>

          <ListingPrice attributes={attributes} />

          <div className="mt-2 flex flex-wrap items-center text-xs text-gray-400 gap-x-3 gap-y-0.5">
            {city && (
              <span className="flex items-center gap-0.5">
                <MapPinIcon className="w-3 h-3 shrink-0" />
                {city.name}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <EyeIcon className="w-3 h-3 shrink-0" />
              {viewsCount}
              <span className="ml-1">{timeAgo(createdAt)}</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/shpalljet/${listing.slug}`}
      className={`group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
        isFeatured ? 'border border-accent' : 'border border-gray-200'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={primaryImage?.altText ?? title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaceholderIcon className="w-10 h-10 text-gray-300" />
          </div>
        )}

          <ListingBadges featured={isFeatured} urgent={isUrgent} />
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col">
        <h2 className="text-sm sm:text-base font-semibold text-dark line-clamp-2 min-h-10 sm:min-h-11 group-hover:text-accent transition-colors leading-snug">
          {title}
        </h2>

        <ListingPrice attributes={attributes} />

        <div className="mt-3 flex flex-col gap-1.5 text-xs text-gray-500">
          {city && <span className="flex min-w-0 items-center gap-1"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /><span className="truncate" title={city.name}>{city.name}</span></span>}
          <time dateTime={createdAt}>{timeAgo(createdAt)}</time>
        </div>
      </div>
    </Link>
  );
}

function ListingBadges({ featured, urgent }: { featured: boolean; urgent: boolean }) {
  if (!featured && !urgent) return null;
  return <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
    {featured && <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-white">E zgjedhur</span>}
    {urgent && <span className="rounded-md bg-red-700 px-2 py-1 text-xs font-semibold text-white">Urgjent</span>}
  </div>;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function PlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
