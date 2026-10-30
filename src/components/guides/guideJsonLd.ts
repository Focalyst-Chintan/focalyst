import { CATEGORY_LABELS, type Guide, type Platform } from '@/content/guides';
import { breadcrumb } from '@/lib/seo/schema';
import { SITE, hasSteps, plainText } from './guideUtils';

function howToSection(name: string, platform: Platform) {
  const steps = (platform.methods ?? []).flatMap((m) =>
    m.steps.map((s) => (m.label ? `${m.label}: ${plainText(s)}` : plainText(s))),
  );
  return {
    '@type': 'HowToSection',
    name,
    itemListElement: steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    })),
  };
}

export function guideHowTo(g: Guide) {
  const sections = [
    hasSteps(g.web) ? howToSection('On the web', g.web) : null,
    hasSteps(g.phone) ? howToSection('On your phone', g.phone) : null,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: g.question,
    description: g.answer,
    url: `${SITE}/guides/${g.slug}`,
    inLanguage: 'en',
    dateModified: g.updated,
    keywords: g.keywords.join(', '),
    publisher: { '@id': `${SITE}/#organization` },
    step: sections,
  };
}

export function guideBreadcrumb(g: Guide) {
  return breadcrumb([
    { name: 'How to use', path: '/guides' },
    { name: CATEGORY_LABELS[g.category], path: `/guides#${g.category}` },
    { name: g.title, path: `/guides/${g.slug}` },
  ]);
}

export function guidesCollection(guides: Guide[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'How to use Focalyst',
    description: 'Step-by-step guides for the web app and the phone app.',
    url: `${SITE}/guides`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: guides.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.title,
        url: `${SITE}/guides/${g.slug}`,
      })),
    },
  };
}
