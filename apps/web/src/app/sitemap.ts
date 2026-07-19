import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // Only public, indexable pages belong here (auth-gated app routes are excluded).
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/privacidade`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      // Google Play requires this URL to be publicly reachable, so it stays
      // indexable — just at the lowest priority, since it is not a page anyone
      // should land on by accident.
      url: `${siteUrl}/excluir-conta`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.1,
    },
  ];
}
