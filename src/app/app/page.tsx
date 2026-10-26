import type { Metadata } from 'next';
import FeaturesClient from './FeaturesClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { SOFTWARE_APP, breadcrumb } from '@/lib/seo/schema';
import { FAQ } from '@/content/faq';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Tasks, habits, a Pomodoro focus timer, app blocker, notes, voice notes, accountability groups and Focalyst AI in one productivity app. See everything Focalyst can do.',
  alternates: {
    canonical: 'https://focalyst.online/app',
  },
  openGraph: {
    title: 'Features | Focalyst',
    description:
      'Tasks, habits, a Pomodoro focus timer, app blocker, notes, voice notes, accountability groups and Focalyst AI in one productivity app. See everything Focalyst can do.',
    url: 'https://focalyst.online/app',
  },
};

export default function FeaturesPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Features', path: '/app' },
  ]);

  return (
    <>
      <JsonLd data={[SOFTWARE_APP, faqJsonLd, breadcrumbData]} />
      <FeaturesClient />
    </>
  );
}
