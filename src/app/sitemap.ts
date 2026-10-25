import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/app',
    '/pricing',
    '/about',
    '/contact',
    '/help',
    '/privacy',
    '/terms',
    '/blog',
    '/mcp-preview',
  ];
  const now = new Date('2026-10-20');
  return routes.map((route) => ({
    url: `https://focalyst.online${route}`,
    lastModified: now,
    changeFrequency: route === '/blog' ? ('weekly' as const) : ('monthly' as const),
    priority: route === '' ? 1 : 0.8,
  }));
}
