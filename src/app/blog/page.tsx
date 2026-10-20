import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Essays on focus, study systems and behaviour science from the team behind Focalyst.',
};

const TOPICS = [
  'Focus',
  'Habits',
  'Study systems',
  'Deep work',
  'Behaviour science',
];

export default function BlogPage() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="mx-auto max-w-[760px] pt-14 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            The Focalyst Journal
          </div>
          <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.08] text-ink">
            Notes on focus, habits and{' '}
            <em className="italic">owning your time</em>.
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[28px] text-ink-2">
            Essays on focus, study systems and behaviour science from the team behind Focalyst.
          </p>
        </section>

        {/* Empty State Glass Card */}
        <section className="glass liquid mx-auto mt-12 max-w-[680px] rounded-[28px] p-8 text-center md:p-12">
          <h2 className="font-display text-[32px] leading-tight text-ink">
            First posts are on the way.
          </h2>
          <p className="mx-auto mb-6 mt-2 max-w-[500px] text-[15px] leading-[24px] text-ink-2">
            Thoughtful, practical writing on doing deep work in a distracted world. Be the first to read it.
          </p>
          <div className="mx-auto max-w-[480px]">
            <KitWaitlist buttonLabel="Notify me" />
          </div>
        </section>

        {/* Topics Row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-2 text-[12px] text-ink-3">Topics coming soon</span>
          {TOPICS.map((topic) => (
            <span
              key={topic}
              className="frost rounded-full px-3 py-1 text-[12px] font-medium text-ink-2"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
