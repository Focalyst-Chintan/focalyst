import { Suspense } from 'react';
import { existsSync } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import StartFlow from './StartFlow';

export const metadata: Metadata = {
  title: { absolute: 'Get started · Focalyst' },
  robots: { index: false, follow: false },
};

// Checked at build time: a collage screen uses its image only when both the light and dark files exist.
function collageImages(): boolean[] {
  return Array.from({ length: 8 }, (_, i) =>
    ['light', 'dark'].every((t) => {
      try { return existsSync(path.join(process.cwd(), 'public', 'onboarding', `collage-${i + 1}-${t}.webp`)); } catch { return false; }
    })
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <StartFlow collageImages={collageImages()} />
    </Suspense>
  );
}
