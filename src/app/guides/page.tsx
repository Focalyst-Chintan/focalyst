import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { GuidesHub } from '@/components/guides/GuidesHub';
import { toCardData } from '@/components/guides/GuideCard';
import { guidesCollection } from '@/components/guides/guideJsonLd';
import { hubMetadata } from '@/components/guides/guideMetadata';
import { breadcrumb } from '@/lib/seo/schema';
import { GUIDES } from '@/content/guides';

export const dynamic = 'force-static';

export const metadata: Metadata = hubMetadata();

export default function GuidesPage() {
  return (
    <PublicLayout>
      <JsonLd
        data={[
          guidesCollection(GUIDES),
          breadcrumb([
            { name: 'Focalyst', path: '/' },
            { name: 'How to use', path: '/guides' },
          ]),
        ]}
      />
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-14 sm:px-6 sm:pt-16">
        <GuidesHub cards={GUIDES.map(toCardData)} basePath="/guides" />
      </div>
    </PublicLayout>
  );
}
