import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { GuidePage } from '@/components/guides/GuidePage';
import { guideMetadata } from '@/components/guides/guideMetadata';
import { GUIDES, getGuide } from '@/content/guides';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

// In-app copy of /guides/[slug]: noindex, canonical to the public page
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? guideMetadata(guide, { inApp: true }) : {};
}

export default async function HowToGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <div className="relative isolate w-full px-4 pb-10 pt-6 font-ui sm:px-6 lg:px-0 lg:pt-2">
      {/* The desktop shell has its own ambient background; this one sits behind the page on phones */}
      <div className="lg:hidden">
        <AmbientBackground className="absolute inset-0 -z-10 overflow-hidden bg-canvas" />
      </div>
      <GuidePage guide={guide} basePath="/how-to" />
    </div>
  );
}
