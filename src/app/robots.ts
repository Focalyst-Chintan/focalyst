import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/today',
        '/plan',
        '/focus',
        '/notes',
        '/insights',
        '/settings',
        '/mcp',
        '/groups',
      ],
    },
    sitemap: 'https://focalyst.online/sitemap.xml',
  };
}
