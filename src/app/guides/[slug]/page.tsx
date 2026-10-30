import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { GuidePage } from '@/components/guides/GuidePage';
import { guideBreadcrumb, guideHowTo } from '@/components/guides/guideJsonLd';
import { guideMetadata } from '@/components/guides/guideMetadata';
import { GUIDES, getGuide } from '@/content/guides';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? guideMetadata(guide) : {};
}

export default async function GuideSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <PublicLayout>
      <JsonLd data={[guideHowTo(guide), guideBreadcrumb(guide)]} />
      <div className="w-full px-4 pb-24 pt-14 sm:px-6 sm:pt-16">
        <GuidePage guide={guide} basePath="/guides" />
      </div>
    </PublicLayout>
  );
}
