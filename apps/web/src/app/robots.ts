import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/paneli/', '/auth/'] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ofertasuksesi.com'}/sitemap.xml`,
  };
}
