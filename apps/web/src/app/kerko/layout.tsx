import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kërko Shpallje',
  description: 'Kërkoni shpallje në Oferta Suksesi — platforma e shpalljeve në Kosovë.',
  alternates: { canonical: '/kerko' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
