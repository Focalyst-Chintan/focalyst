import type { Metadata } from 'next';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { GuidesHub } from '@/components/guides/GuidesHub';
import { toCardData } from '@/components/guides/GuideCard';
import { hubMetadata } from '@/components/guides/guideMetadata';
import { GUIDES } from '@/content/guides';

// In-app copy of /guides: noindex, canonical to the public page
export const metadata: Metadata = hubMetadata({ inApp: true });

export default function HowToPage() {
  return (
    <div className="relative isolate w-full px-4 pb-10 pt-6 font-ui sm:px-6 lg:px-0 lg:pt-2">
      {/* The desktop shell has its own ambient background; this one sits behind the page on phones */}
      <div className="lg:hidden">
        <AmbientBackground className="absolute inset-0 -z-10 overflow-hidden bg-canvas" />
      </div>
      <GuidesHub cards={GUIDES.map(toCardData)} basePath="/how-to" />
    </div>
  );
}
