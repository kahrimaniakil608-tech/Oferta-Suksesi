import ListingPrice from '@/components/listings/ListingPrice';
import { serializeJsonLd } from '@/lib/json-ld';
import ListingView from '@/components/listings/ListingView';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ListingCard from '@/components/listings/ListingCard';
import ImageGallery from '@/components/listings/ImageGallery';
import ContactSection from '@/components/listings/ContactSection';
import ReportModal from '@/components/listings/ReportModal';
import ShareButtons from '@/components/listings/ShareButtons';
import RenewButton from '@/components/listings/RenewButton';
import AdminEditButton from '@/components/listings/AdminEditButton';
import FavouriteButton from '@/components/listings/FavouriteButton';
import AdZone from '@/components/ads/AdZone';
import { getListing, getListings } from '@/lib/api';
import { formatPrice, timeAgo } from '@/lib/utils';
import { SITE_URL } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001';

// Human-readable labels for dynamic attributes
const ATTR_LABELS: Record<string, string> = {
  price:        'Çmimi',
  telefoni:     'Telefoni',
  phone:        'Telefoni',
  dhoma:        'Dhoma gjumi',
  rooms:        'Dhoma',
  kati:         'Kati',
  floor:        'Kati',
  katet:        'Katet gjithsej',
  siperfaqja:   'Sipërfaqja (m²)',
  area:         'Sipërfaqja',
  viti:         'Viti',
  year:         'Viti prodhimit',
  marka:        'Marka',
  brand:        'Marka',
  modeli:       'Modeli',
  model:        'Modeli',
  km:           'Kilometrazhi',
  ngjyra:       'Ngjyra',
  color:        'Ngjyra',
  gjendja:      'Gjendja',
  condition:    'Gjendja',
  transmision:  'Transmisioni',
  karburanti:   'Karburanti',
  fuel:         'Karburanti',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing || listing.status !== 'PUBLISHED') return { title: 'Shpallja nuk u gjet' };

  const price = typeof listing.attributes?.price === 'number' ? listing.attributes.price : undefined;
  const desc = `${listing.title} - ${price ? formatPrice(price) + ' - ' : ''}${listing.city?.name ?? 'Kosovë'}`;
  const firstImg = listing.images?.[0];
  // Use medium image for OG (optimized size for social sharing), fallback to original
  const ogImage = firstImg
    ? firstImg.mediumUrl
      ? `${IMAGE_BASE}${firstImg.mediumUrl}`
      : `${IMAGE_BASE}/uploads/${firstImg.url}`
    : undefined;
  const listingUrl = `${SITE_URL}/shpalljet/${listing.slug}`;

  return {
    title: `${listing.title} — ${listing.category?.name ?? 'Shpallje'}`,
    description: desc,
    alternates: { canonical: `/shpalljet/${listing.slug}` },
    openGraph: {
      title: listing.title,
      description: desc,
      url: listingUrl,
      siteName: 'Oferta Suksesi',
      type: 'article',
      ...(ogImage
        ? { images: [{ url: ogImage, width: 800, height: 600, alt: listing.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description: desc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();
  if (listing.status !== 'PUBLISHED') notFound();

  const price    = typeof listing.attributes?.price === 'number' ? listing.attributes.price : undefined;
  const rawPhone = listing.attributes?.telefoni ?? listing.attributes?.phone;
  const phoneList: string[] = Array.isArray(rawPhone) ? rawPhone : (rawPhone ? [String(rawPhone)] : []);
  const phone    = phoneList[0] as string | undefined;

  // Related listings: same category, exclude current
  const { data: related } = await getListings({
    category: listing.category?.slug,
    limit: 6,
  });
  const relatedFiltered = related.filter((l) => l.id !== listing.id).slice(0, 6);

  // Attributes to display (exclude price, phone, email since rendered separately)
  const hiddenAttrKeys = ['price', 'telefoni', 'phone', 'phone2', 'email', 'emaili', 'kontakt_email', 'contactemail', 'cmimi_negociueshem'];
  const displayAttrs = Object.entries(listing.attributes ?? {}).filter(
    ([k]) => !hiddenAttrKeys.includes(k.toLowerCase()) && listing.attributes[k] !== null && listing.attributes[k] !== '',
  );

  // Resolve contact email: prefer the one the author put in the listing attributes, then guestEmail
  const rawEmail = listing.attributes?.email ?? listing.attributes?.emaili ?? listing.attributes?.kontakt_email ?? listing.attributes?.ContactEmail ?? listing.attributes?.contactEmail;
  const contactEmail = rawEmail ? String(rawEmail) : (listing.guestEmail ?? null);

  // Schema.org structured data
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: listing.images.map((img) => `${IMAGE_BASE}/uploads/${img.url}`),
    url: `${SITE_URL}/shpalljet/${listing.slug}`,
    category: listing.category?.name,
    ...(price !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Person', name: listing.user?.name ?? listing.guestName },
          },
        }
      : {}),
    address: listing.city?.name
      ? { '@type': 'PostalAddress', addressLocality: listing.city.name, addressCountry: 'XK' }
      : undefined,
  };

  return (
    <>
      <ListingView listingId={listing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Fillimi', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: listing.category?.name, item: `${SITE_URL}/kategorite/${listing.category?.slug}` },
            { '@type': 'ListItem', position: 3, name: listing.title },
          ]
        })}}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigimi" className="mb-4 text-sm text-gray-400 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-accent transition-colors">Fillimi</Link>
          <span aria-hidden="true">›</span>
          {listing.category && (
            <>
              <Link
                href={`/kategorite/${listing.category.slug}`}
                className="hover:text-accent transition-colors"
              >
                {listing.category.name}
              </Link>
              <span aria-hidden="true">›</span>
            </>
          )}
          <span className="text-dark font-medium truncate max-w-[200px]" aria-current="page">
            {listing.title}
          </span>
          <AdminEditButton listingId={listing.id} />
        </nav>

        {/* Listing top banner */}
        <AdZone slug="listing-top" className="mb-2" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* ── Left column ─────────────────────────────────────── */}
          <div className="md:col-span-7 space-y-5">
            {/* Image gallery */}
            <ImageGallery images={listing.images} title={listing.title} />

            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {listing.isFeatured && (
                  <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-md font-semibold">
                    ⭐ E Zgjedhur
                  </span>
                )}
                {listing.isUrgent && (
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-md font-semibold">
                    🔴 Urgjent
                  </span>
                )}
                {listing.category && (
                  <Link
                    href={`/kategorite/${listing.category.slug}`}
                    className="inline-flex items-center bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    {listing.category.name}
                  </Link>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-dark leading-snug">
                {listing.title}
              </h1>

              <ListingPrice attributes={listing.attributes} />

              {/* Favourite + Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500">
                <FavouriteButton listingId={listing.id} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                {listing.city && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {listing.city.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {timeAgo(listing.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {listing.viewsCount} shikime
                </span>
              </div>
            </div>

            <div className="md:hidden"><ContactSection listingId={listing.id} phones={phoneList} email={contactEmail} title={listing.title} /></div>
            {/* Description */}
            {listing.description && (
              <section aria-labelledby="desc-heading">
                <h2 id="desc-heading" className="font-bold text-dark mb-2">Përshkrimi</h2>
                <div className="prose prose-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {listing.description}
                </div>
              </section>
            )}

            {/* Attributes grid */}
            {displayAttrs.length > 0 && (
              <section aria-labelledby="attrs-heading">
                <h2 id="attrs-heading" className="font-bold text-dark mb-3">Detajet</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {displayAttrs.map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg px-3 py-2.5"
                    >
                      <dt className="text-xs text-gray-400 font-medium capitalize">
                        {ATTR_LABELS[key] ?? key}
                      </dt>
                      <dd className="text-sm font-semibold text-dark mt-0.5">
                        {String(val)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          {/* ── Right column ─────────────────────────────────────── */}
          <div className="md:col-span-5 space-y-4">
            {/* Sticky wrapper on desktop */}
            <div className="md:sticky md:top-28 xl:top-20 space-y-4">
              {/* Contact card */}
              <div className="hidden md:block"><ContactSection
                listingId={listing.id}
                phone={phone}
                phones={phoneList}
                email={contactEmail}
                title={listing.title}
              /></div>

              {/* Sidebar ad */}
              <AdZone slug="sidebar-small" className="w-full" />

              {/* Share */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <ShareButtons title={listing.title} />
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <ReportModal listingId={listing.id} />
                </div>
              </div>

              {/* Renew / Bump (only visible to owner) */}
              {listing.user && (
                <RenewButton
                  listingId={listing.id}
                  ownerId={listing.user.id}
                  status={listing.status}
                  renewalCount={listing.renewalCount ?? 0}
                  bumpedAt={listing.bumpedAt}
                />
              )}
            </div>
          </div>
        </div>

        {/* Ad between content and related */}
        <div className="flex justify-center mt-8">
          <AdZone slug="listing-bottom" />
        </div>

        {/* Related listings */}
        {relatedFiltered.length > 0 && (
          <section className="mt-12" aria-labelledby="related-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="related-heading" className="font-bold text-dark text-lg">
                Shpalljet e Ngjashme
              </h2>
              {listing.category && (
                <Link
                  href={`/kategorite/${listing.category.slug}`}
                  className="text-sm text-accent font-semibold hover:underline"
                >
                  Shiko të gjitha →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {relatedFiltered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
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
