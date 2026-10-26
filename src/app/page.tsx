import type { Metadata } from 'next';
import LandingClient from './LandingClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { SOFTWARE_APP } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'Focalyst: AI productivity app for planning, focus and habits',
  description:
    'Focalyst is an all-in-one productivity app for web, iOS and Android. Plan tasks, run focus sessions, build habits with friends and get a weekly AI report. Free to start.',
  alternates: {
    canonical: 'https://focalyst.online',
  },
  openGraph: {
    title: 'Focalyst: AI productivity app for planning, focus and habits',
    description:
      'Focalyst is an all-in-one productivity app for web, iOS and Android. Plan tasks, run focus sessions, build habits with friends and get a weekly AI report. Free to start.',
    url: 'https://focalyst.online',
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={SOFTWARE_APP} />
      <LandingClient />
    </>
  );
}
