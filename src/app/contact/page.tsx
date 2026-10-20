import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import ContactClient from '@/components/desktop/public/ContactClient';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Questions, feedback, a bug you spotted or an idea that would make Focalyst better. We would love to hear from you.',
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <ContactClient />
    </PublicLayout>
  );
}
