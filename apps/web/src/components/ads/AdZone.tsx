import { serverApiFetch } from '@/lib/server-fetch';
import AdBanner from './AdBanner';
import AdRotator from './AdRotator';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface ZoneAd {
  id: string;
  title: string;
  adType?: string;
  imageUrl?: string | null;
  embedCode?: string | null;
  targetUrl: string;
}

interface ZoneResponse {
  zone: { id: string; name: string; slug: string; width: number; height: number; rotationInterval?: number };
  ads: ZoneAd[];
}

interface AdZoneProps {
  /** Zone slug as configured in the database (e.g. "homepage-leaderboard") */
  slug: string;
  /** Optional category ID for targeted ads */
  categoryId?: number;
  /** Optional city ID for targeted ads */
  cityId?: number;
  /** Tailwind classes applied to the wrapper div */
  className?: string;
  /** Show "Reklamë" label above the banner */
  labeled?: boolean;
}

async function fetchZone(
  slug: string,
  categoryId?: number,
  cityId?: number,
): Promise<ZoneResponse | null> {
  try {
    const params = new URLSearchParams();
    if (categoryId !== undefined) params.set('categoryId', String(categoryId));
    if (cityId !== undefined)     params.set('cityId',     String(cityId));
    const url = `${API}/ads/zone/${slug}${params.size ? `?${params}` : ''}`;
    const res = await serverApiFetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdZone({ slug, categoryId, cityId, className = '', labeled = true }: AdZoneProps) {
  const data = await fetchZone(slug, categoryId, cityId);

  // No zone configured or no active ads — render nothing
  if (!data || data.ads.length === 0) return null;

  const { zone, ads } = data;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {labeled && (
        <p className="text-xs text-gray-400 uppercase tracking-widest self-start">Reklamë</p>
      )}
      {ads.length === 1 ? (
        <AdBanner ad={ads[0]} width={zone.width} height={zone.height} />
      ) : (
        <AdRotator
          ads={ads}
          width={zone.width}
          height={zone.height}
          interval={zone.rotationInterval ?? 5}
        />
      )}
    </div>
  );
}
