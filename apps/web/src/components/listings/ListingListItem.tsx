import ListingCard from './ListingCard';
import type { Listing } from '@/lib/api';

export default function ListingListItem({ listing }: { listing: Listing }) {
  return <ListingCard listing={listing} variant="list" />;
}
