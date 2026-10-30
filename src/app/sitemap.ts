import type { MetadataRoute } from 'next';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/app', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/pricing', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.6 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/help', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/mcp-preview', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/privacy', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/terms', changeFrequency: 'monthly' as const, priority: 0.6 },
  ];

  const now = new Date();

  // "How to use" guides. Only the public /guides pages; the in-app /how-to copies are never listed.
  const latestGuide = GUIDES.reduce((max, g) => (g.updated > max ? g.updated : max), GUIDES[0].updated);
  const guides: MetadataRoute.Sitemap = [
    {
      url: 'https://focalyst.online/guides',
      lastModified: new Date(latestGuide),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: `https://focalyst.online/guides/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return [
    ...routes.map((r) => ({
      url: `https://focalyst.online${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...guides,
  ];
}
