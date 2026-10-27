import type { Metadata } from 'next';
import AmbientBackground from '@/components/desktop/AmbientBackground';

export const metadata: Metadata = {
  title: 'Connect an app · Focalyst',
  robots: { index: false, follow: false },
};

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <AmbientBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <span className="mb-6 font-ui text-[13px] font-semibold tracking-[0.32em] text-ink">FOCALYST</span>
        {children}
      </main>
    </div>
  );
}
