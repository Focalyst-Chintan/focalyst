import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const PRIVATE = [
  '/today',
  '/plan',
  '/focus',
  '/notes',
  '/insights',
  '/settings',
  '/mcp',
  '/groups',
  '/paywall',
  '/onboarding/',
  '/billing/',
  '/api/',
  '/auth/',
];

const AI_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: 'https://focalyst.online/sitemap.xml',
    host: 'https://focalyst.online',
  };
}
