'use client';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const KEEP_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'ref']);
const SKIP_PATHS = ['/auth', '/login/callback', '/reset-password', '/forgot-password', '/api'];

function scrub(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (SKIP_PATHS.some((p) => u.pathname.startsWith(p))) return null; // never send auth or token pages
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (!KEEP_PARAMS.has(k)) u.searchParams.delete(k);
    u.pathname = u.pathname
      .replace(UUID, ':id')
      .replace(/\/\d{3,}(?=\/|$)/g, '/:n')
      .replace(/\/groups\/(?:join|invite)\/[^/]+/gi, '/groups/join/:code')
      .replace(/\/(join|invite)\/[^/]+/gi, '/$1/:code');
    return u.toString();
  } catch {
    return null;
  }
}

export function VercelInsights() {
  return (
    <>
      <Analytics
        beforeSend={(event) => {
          const url = scrub(event.url);
          return url ? { ...event, url } : null;
        }}
      />
      <SpeedInsights
        sampleRate={1}
        beforeSend={(event) => {
          const url = scrub(event.url);
          return url ? { ...event, url } : null;
        }}
      />
    </>
  );
}
