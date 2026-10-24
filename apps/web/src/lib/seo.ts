export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ofertasuksesi.com';
export const SITE_NAME = 'Oferta Suksesi';

export function breadcrumbJsonLd(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: `${SITE_URL}${item.url}` } : {}),
    })),
  };
}
