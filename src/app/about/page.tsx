import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarCheck2,
  Timer,
  NotebookPen,
  ChartColumn,
  Users,
  Sparkles,
} from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Focalyst is a calm, all-in-one productivity hub for people who want to do meaningful work without the noise.',
};

const BELIEFS = [
  {
    title: 'Calm over clutter',
    text: 'A tool should lower the noise in your day, not add to it. Every screen in Focalyst is designed to be quiet and clear.',
  },
  {
    title: 'Focus is a skill',
    text: 'Deep work is not a personality trait. It is built one session at a time, and Focalyst helps you practise it.',
  },
  {
    title: 'Reflection drives growth',
    text: 'You cannot improve what you never look at. Insights, streaks and weekly reports turn your days into lessons.',
  },
  {
    title: 'Your data is yours',
    text: 'What you write and track stays private. We never sell it and never use it for advertising.',
  },
];

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: 'Plan',
    text: 'Habits, tasks and a calendar that keeps your week in view.',
  },
  {
    icon: Timer,
    title: 'Focus',
    text: 'A distraction-free timer, with every minute you focus saved.',
  },
  {
    icon: NotebookPen,
    title: 'Notes',
    text: 'Rich notes, checklists and voice notes with AI summaries.',
  },
  {
    icon: ChartColumn,
    title: 'Insights',
    text: 'Levels, streaks, a productivity score and a weekly Catalyst Report.',
  },
  {
    icon: Users,
    title: 'Accountability',
    text: 'Habit groups that keep you consistent with friends.',
  },
  {
    icon: Sparkles,
    title: 'Focalyst AI',
    text: 'A coach that understands your tasks, habits and focus.',
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="fx-reveal mx-auto max-w-[760px] pt-14 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            About Focalyst
          </div>
          <h1 className="mt-3 font-display text-[clamp(44px,5vw,60px)] leading-[1.06] text-ink">
            Own your time.
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] text-[18px] leading-[30px] text-ink-2">
            Focalyst is a calm, all-in-one productivity hub for people who want to do meaningful work without the noise. Plan your days, focus deeply, capture your ideas and see how you are really growing, all in one quiet place.
          </p>
        </section>

        {/* Why Focalyst exists */}
        <section
          className="fx-reveal mx-auto mt-20 max-w-[720px]"
          style={{ ['--fx-delay' as string]: '80ms' }}
        >
          <h2 className="font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
            Why Focalyst exists
          </h2>
          <p className="mt-4 text-[16px] leading-[28px] text-ink-2">
            Most productivity tools compete for the very thing they promise to protect: your attention. Notifications, endless features and scattered apps turn getting organised into another job. Focalyst takes a different path. It brings planning, focus, notes and reflection together, keeps every screen calm, and uses AI only where it genuinely helps you think more clearly about your own time.
          </p>
        </section>

        {/* What we believe */}
        <section
          className="fx-reveal mx-auto mt-20 max-w-[960px]"
          style={{ ['--fx-delay' as string]: '160ms' }}
        >
          <h2 className="text-center font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
            What we believe
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {BELIEFS.map((belief) => (
              <div key={belief.title} className="frost rounded-[20px] p-6">
                <h3 className="text-[17px] font-semibold text-ink">
                  {belief.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[24px] text-ink-2">
                  {belief.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Everything in one place */}
        <section
          className="fx-reveal mx-auto mt-20 max-w-[1040px]"
          style={{ ['--fx-delay' as string]: '240ms' }}
        >
          <h2 className="text-center font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
            Everything in one place
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="frost rounded-[20px] p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-[22px] text-ink-2">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Who we are */}
        <section
          className="fx-reveal mx-auto mt-20 max-w-[960px]"
          style={{ ['--fx-delay' as string]: '320ms' }}
        >
          <div className="frost grid grid-cols-1 items-center gap-8 rounded-[28px] p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
            <div>
              <h2 className="font-display text-[28px] leading-[34px] text-ink">
                Who we are
              </h2>
              <p className="mt-4 text-[15px] leading-[26px] text-ink-2">
                Focalyst is built by Chintan, an independent MSME based in Kolkata, India. The word chintan means deep, thoughtful reflection, and that idea shapes everything we make: tools that help you think clearly, act deliberately and grow quietly.
              </p>
              <div className="mt-4 text-[14px] font-semibold text-ink">
                Sohan Tamang, Founder and CEO
              </div>
            </div>

            <div className="ambient-grain relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[22px] bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] p-8 text-center text-snow">
              <span className="font-display text-[56px] italic leading-none text-snow">
                Chintan
              </span>
              <span className="mt-2 text-[14px] font-medium text-snow/90">
                Productivity and Mindful Living
              </span>
              <span className="mt-1 text-[12px] text-snow/75">
                Sohan Tamang, Founder and CEO
              </span>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="fx-reveal glass liquid mx-auto mt-20 max-w-[820px] rounded-[28px] p-10 text-center">
          <h2 className="font-display text-[32px] leading-tight text-ink sm:text-[40px]">
            Start owning your time.
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-6 text-[14px] font-medium text-snow transition-colors hover:bg-primary-hover"
            >
              Get started
            </Link>
            <Link
              href="/help"
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-line bg-surface-2 px-6 text-[14px] font-medium text-ink transition-colors hover:bg-surface-3"
            >
              Read the FAQ
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
