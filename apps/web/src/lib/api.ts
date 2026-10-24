import { serverApiFetch } from '@/lib/server-fetch';
import { withCategoryIcon } from '@/lib/category-icons';
const API_URL = process.env.API_URL ?? 'http://localhost:3001/api/v1';

export interface ListingImage {
  url: string;
  thumbUrl?: string;
  mediumUrl?: string;
  altText?: string | null;
  isPrimary: boolean;
  position: number;
}

export interface ListingCity {
  id: string;
  name: string;
  slug: string;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  attributes: Record<string, unknown>;
  isFeatured: boolean;
  isUrgent: boolean;
  viewsCount: number;
  createdAt: string;
  city?: ListingCity;
  images: ListingImage[];
}

export interface ListingDetail extends Listing {
  description: string;
  contactClicks: number;
  status: string;
  expiresAt: string;
  updatedAt: string;
  renewalCount?: number;
  bumpedAt?: string | null;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  city: ListingCity & { region: string };
  user: { id: string; name: string; slug?: string; avatarUrl: string | null; trustScore: number } | null;
  isGuestListing?: boolean;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
}

export interface ListingsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListingsResponse {
  data: Listing[];
  meta: ListingsMeta;
}

export async function getListings(
  params?: Record<string, string | number | boolean>,
): Promise<ListingsResponse> {
  try {
    const searchParams = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== '')
        .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {} as Record<string, string>),
    );
    const res = await serverApiFetch(`${API_URL}/listings?${searchParams}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.data) || !Number.isFinite(data.meta?.total)) throw new Error('Invalid listings response');
    return data;
  } catch {
    throw new Error('Listing service unavailable');
  }
}

export interface City {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function getCities(): Promise<City[]> {
  try {
    const res = await serverApiFetch(`${API_URL}/cities`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } catch {
    throw new Error('Service unavailable');
  }
}

export async function getCity(slug: string): Promise<City | null> {
  try {
    const res = await serverApiFetch(`${API_URL}/cities/${slug}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } catch {
    throw new Error('Service unavailable');
  }
}

export interface ApiCategory {
  icon?: string | null;
  id: number;
  name: string;
  slug: string;
  attributeSchema: Record<string, unknown>;
  children: { id: number; name: string; slug: string; attributeSchema: Record<string, unknown> }[];
}

export async function getCategories(): Promise<(ApiCategory & { icon: string })[]> {
  try {
    const res = await serverApiFetch(`${API_URL}/categories`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const categories: ApiCategory[] = await res.json();
    return categories.map(withCategoryIcon);
  } catch {
    throw new Error('Service unavailable');
  }
}

export async function getListing(id: string): Promise<ListingDetail | null> {
  try {
    const res = await serverApiFetch(`${API_URL}/listings/${id}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } catch {
    throw new Error('Service unavailable');
  }
}
