import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import ContactClient from '@/components/desktop/public/ContactClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact the Focalyst team for support, billing, privacy requests or partnerships.',
  alternates: {
    canonical: 'https://focalyst.online/contact',
  },
  openGraph: {
    title: 'Contact | Focalyst',
    description:
      'Contact the Focalyst team for support, billing, privacy requests or partnerships.',
    url: 'https://focalyst.online/contact',
  },
};

export default function ContactPage() {
  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Contact', path: '/contact' },
  ]);

  return (
    <PublicLayout>
      <JsonLd data={breadcrumbData} />
      <ContactClient />
    </PublicLayout>
  );
}
