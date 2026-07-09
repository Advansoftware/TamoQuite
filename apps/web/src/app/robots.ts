import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, auth-gated or transactional routes shouldn't be indexed.
        disallow: [
          '/dashboard',
          '/loans',
          '/borrowers',
          '/admin',
          '/settings',
          '/redefinir-senha',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
