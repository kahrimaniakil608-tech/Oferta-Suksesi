import { formatPrice } from '@/lib/utils';

export default function ListingPrice({attributes}: {attributes?: Record<string, unknown> | null}) {
  const raw = attributes?.price;
  const price = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  const negotiable = attributes?.cmimi_negociueshem === true;
  return <p className="font-semibold text-accent text-sm mt-1">
    {Number.isFinite(price) && price >= 0 ? formatPrice(price) : 'Çmimi nuk është specifikuar'}
    {negotiable && <span className="block text-xs text-gray-600 font-normal">I negociueshëm</span>}
  </p>;
}
