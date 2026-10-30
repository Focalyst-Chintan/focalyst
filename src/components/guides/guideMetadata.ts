import type { Metadata } from 'next';
import type { Guide } from '@/content/guides';
import { SITE, metaDescription, metaTitle } from './guideUtils';

const OG_IMAGE = { url: '/landing/hero.png', width: 1200, height: 630 };

export const HUB_TITLE = 'How to use Focalyst · Guides for web and phone';
export const HUB_DESCRIPTION =
  'Step-by-step guides for tasks, habits, focus sessions, notes, voice notes, insights, Focalyst AI, widgets and more, on the web and the phone app.';

// The public /guides pages are indexed; the in-app /how-to copies are noindex
// with a canonical pointing at the public page.
export function hubMetadata({ inApp = false }: { inApp?: boolean } = {}): Metadata {
  const url = `${SITE}/guides`;
  return {
    title: { absolute: HUB_TITLE },
    description: HUB_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title: HUB_TITLE, description: HUB_DESCRIPTION, url, type: 'website', images: [OG_IMAGE] },
    twitter: {
      card: 'summary_large_image',
      title: HUB_TITLE,
      description: HUB_DESCRIPTION,
      images: [OG_IMAGE.url],
    },
    ...(inApp ? { robots: { index: false, follow: true } } : {}),
  };
}

export function guideMetadata(g: Guide, { inApp = false }: { inApp?: boolean } = {}): Metadata {
  const url = `${SITE}/guides/${g.slug}`;
  const title = metaTitle(g);
  const description = metaDescription(g);
  return {
    title: { absolute: title },
    description,
    keywords: g.keywords,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article', modifiedTime: g.updated, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
    ...(inApp ? { robots: { index: false, follow: true } } : {}),
  };
}
