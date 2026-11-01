import type { MetadataRoute } from 'next';
import { GUIDES } from '@/content/guides';
import { getPosts } from '@/lib/blog/source';
import { PILLAR_KEYS } from '@/lib/blog/constants';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Focalyst Journal: every published post and every topic hub
  // Same query as /blog/rss.xml
  const { posts } = await getPosts({ limit: 1000 });
  const journal: MetadataRoute.Sitemap = [
    ...PILLAR_KEYS.map((pillar) => ({
      url: `https://focalyst.online/blog/topics/${pillar}`,
      lastModified: new Date(posts.find((p) => p.pillar === pillar)?.updatedIso ?? now),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: `https://focalyst.online/blog/${p.slug}`,
      lastModified: new Date(p.updatedIso),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
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
    ...journal,
  ];
}
