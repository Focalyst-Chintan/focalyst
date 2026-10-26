import type { Metadata } from 'next';
import HelpClient from './HelpClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';
import { FAQ_CATEGORIES } from '@/data/faqData';

export const metadata: Metadata = {
  title: 'Help and FAQ',
  description:
    'Answers about Focalyst accounts, plans, focus timers, habits, notes, voice notes, Focalyst AI and privacy.',
  alternates: {
    canonical: 'https://focalyst.online/help',
  },
  openGraph: {
    title: 'Help and FAQ | Focalyst',
    description:
      'Answers about Focalyst accounts, plans, focus timers, habits, notes, voice notes, Focalyst AI and privacy.',
    url: 'https://focalyst.online/help',
  },
};

export default function HelpPage() {
  const mainEntity = FAQ_CATEGORIES.flatMap((cat) =>
    cat.items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    }))
  );

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };

  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Help and FAQ', path: '/help' },
  ]);

  return (
    <>
      <JsonLd data={[faqJsonLd, breadcrumbData]} />
      <HelpClient />
    </>
  );
}
