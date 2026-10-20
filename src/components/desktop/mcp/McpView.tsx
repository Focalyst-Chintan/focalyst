'use client';
import React from 'react';
import Link from 'next/link';
import {
  MessageSquareText,
  ChartSpline,
  Compass,
  CalendarPlus,
  NotebookPen,
  AppWindow,
  Check,
} from 'lucide-react';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';
import FaqAccordion from '@/components/desktop/public/FaqAccordion';

interface McpViewProps {
  defaultEmail?: string;
  firstName?: string;
  isSignedIn?: boolean;
}

const CAPABILITIES = [
  {
    icon: MessageSquareText,
    title: 'Answer with context',
    description:
      'Ask why your focus dipped this week and get an answer built on your sessions, not on guesses.',
  },
  {
    icon: ChartSpline,
    title: 'Analyse in depth',
    description:
      'Spot patterns across weeks: when you focus best, which habits slip first and what quietly derails a good day.',
  },
  {
    icon: Compass,
    title: 'Build new strategies',
    description:
      'Turn your data into a plan you can follow: a revision schedule, a habit stack or a realistic week.',
  },
  {
    icon: CalendarPlus,
    title: 'Plan from any chat',
    description:
      'Say "Add revise anatomy for tomorrow at 7" and it lands in Focalyst, ready when you are.',
  },
  {
    icon: NotebookPen,
    title: 'Review your progress',
    description:
      'Ask for a weekly debrief, detailed or brief, in the tone that keeps you going.',
  },
  {
    icon: AppWindow,
    title: 'Stay where you already work',
    description:
      'No new app to learn. Your coach lives inside the AI assistant you already open every day.',
  },
];

const MCP_FAQ = [
  {
    id: 'mcp-what-is-mcp',
    question: 'What is MCP?',
    answer:
      'MCP, the Model Context Protocol, is an open standard that lets AI assistants connect securely to apps and data sources. It is how your AI assistant will read your Focalyst data.',
  },
  {
    id: 'mcp-which-assistants',
    question: 'Which AI assistants will work?',
    answer:
      'Any assistant that supports MCP connections. That includes ChatGPT, Claude and Gemini where their apps offer MCP support, and more tools are adding it all the time.',
  },
  {
    id: 'mcp-is-it-free',
    question: 'Is it free?',
    answer: 'MCP is a Focalyst Pro feature. Anyone can join the waitlist.',
  },
  {
    id: 'mcp-when-launch',
    question: 'When will it launch?',
    answer: 'We are building it now. Waitlist members hear first.',
  },
];

export default function McpView({
  defaultEmail = '',
  firstName,
  isSignedIn = false,
}: McpViewProps) {
  const scrollToWaitlist = () => {
    const el = document.getElementById('mcp-waitlist');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      {/* Top Hero */}
      <section className="fx-reveal mx-auto max-w-[760px] pt-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Focalyst Labs
          </span>
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-text">
            Coming soon
          </span>
          <span className="rounded-full bg-gradient-to-r from-[#0B2CB1] to-[#1951FC] px-2.5 py-0.5 text-[11px] font-semibold text-snow">
            Pro
          </span>
        </div>

        <h1 className="mt-4 font-display text-[clamp(40px,5vw,56px)] leading-[1.06] text-ink">
          Your Focalyst, inside your AI.
        </h1>

        <p className="mx-auto mt-4 max-w-[640px] text-[17px] leading-[28px] text-ink-2">
          Connect your Focalyst data to ChatGPT, Claude, Gemini or any AI assistant you already use, and turn an ordinary chatbot into a productivity coach that actually knows you.
        </p>

        <div id="mcp-waitlist" className="mx-auto mt-8 max-w-[520px] scroll-mt-24">
          <KitWaitlist defaultEmail={defaultEmail} firstName={firstName} />
          <p className="mt-2.5 text-[12px] text-ink-3">
            MCP will be available on Focalyst Pro. Join now for early access.
          </p>
        </div>
      </section>

      {/* Generic advice vs Context */}
      <section
        className="fx-reveal mx-auto mt-20 max-w-[720px] text-center"
        style={{ ['--fx-delay' as string]: '80ms' }}
      >
        <h2 className="font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
          Generic advice, or advice built on your week?
        </h2>
        <p className="mt-4 text-[16px] leading-[28px] text-ink-2">
          Ask a regular AI how to focus better and you get the same tips it gives everyone. It has never seen your habits, your deadlines or the hours you actually do your best work. Connect Focalyst and that changes. Your AI can read your tasks, habits, focus sessions, notes and goals, so every answer starts from your real life, not from an average person&apos;s.
        </p>
      </section>

      {/* Comparison Card */}
      <section
        className="fx-reveal mx-auto mt-10 max-w-[960px]"
        style={{ ['--fx-delay' as string]: '160ms' }}
      >
        <div className="flex justify-center">
          <div className="frost rounded-full px-4 py-1.5 text-[13px] font-medium text-ink">
            &ldquo;How do I stay consistent this month?&rdquo;
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Left: Ordinary AI */}
          <div className="frost rounded-[24px] p-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              An ordinary AI
            </div>
            <div className="mt-4 rounded-[16px] bg-surface-2 p-4 text-[14px] leading-[22px] text-ink-2">
              Set clear goals, remove distractions and try the Pomodoro technique.
            </div>
          </div>

          {/* Right: Your AI, with Focalyst */}
          <div className="glass liquid rounded-[24px] border border-primary/40 p-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
              Your AI, with Focalyst
            </div>
            <div className="mt-4 rounded-[16px] bg-primary-soft/60 p-4 text-[14px] leading-[22px] text-ink">
              Your Yoga streak is your strongest right now, but Run has slipped five times this week, and each time you focused past 11 PM the night before. You do your best work around 9 PM. Try running before 7 PM and protect a 9 PM deep work block.
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[12px] text-ink-3">
          Example answer. Your coach works from your own data.
        </p>
      </section>

      {/* Capability Grid */}
      <section
        className="fx-reveal mx-auto mt-20 max-w-[1040px]"
        style={{ ['--fx-delay' as string]: '240ms' }}
      >
        <h2 className="text-center font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
          What your coach can do
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="frost rounded-[20px] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">
                  {cap.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-[22px] text-ink-2">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why this matters */}
      <section
        className="fx-reveal mx-auto mt-20 max-w-[720px]"
        style={{ ['--fx-delay' as string]: '320ms' }}
      >
        <h2 className="font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
          Why this matters
        </h2>
        <h3 className="mt-3 text-[18px] font-semibold text-ink">
          Advice is everywhere. Context is rare.
        </h3>
        <p className="mt-3 text-[16px] leading-[28px] text-ink-2">
          Most productivity advice fails because it ignores the person reading it: your schedule, your energy, your history. Focalyst already holds an honest record of how you actually spend your time. MCP lets your AI read that record, so the guidance you get is specific, grounded and built around what you have really done. Your data becomes a mirror. Your AI becomes a coach.
        </p>
      </section>

      {/* How it will work */}
      <section className="fx-reveal mx-auto mt-20 max-w-[960px]">
        <h2 className="text-center font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
          How it will work
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="frost rounded-[20px] p-6">
            <div className="font-display text-[22px] text-ink">1. Connect</div>
            <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
              Link Focalyst to your AI assistant with a secure connection in a few clicks.
            </p>
          </div>
          <div className="frost rounded-[20px] p-6">
            <div className="font-display text-[22px] text-ink">2. Ask</div>
            <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
              Ask anything about your habits, tasks, focus and notes in plain language.
            </p>
          </div>
          <div className="frost rounded-[20px] p-6">
            <div className="font-display text-[22px] text-ink">3. Act</div>
            <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
              Let your coach analyse, plan and, with your permission, add items to Focalyst.
            </p>
          </div>
        </div>
      </section>

      {/* You stay in control */}
      <section className="mx-auto mt-20 max-w-[760px]">
        <h2 className="font-display text-[28px] leading-[34px] text-ink sm:text-[34px]">
          You stay in control
        </h2>
        <p className="mt-2 text-[15px] text-ink-2">
          We are designing MCP so that:
        </p>

        <div className="mt-6 space-y-3">
          {[
            'It is read-only by default. Your AI can look, not change, until you allow it.',
            'You choose what to share. Connect only the parts of Focalyst you want.',
            'You can disconnect anytime. One click and the connection is gone.',
            'Your data is never sold or used for advertising.',
          ].map((item) => (
            <div key={item} className="frost flex items-center gap-3.5 rounded-[16px] p-4 text-[14px] leading-[22px] text-ink-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Part of Focalyst Pro */}
      <section className="relative mx-auto mt-20 max-w-[880px] overflow-hidden rounded-[28px] bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] p-8 text-snow md:p-10">
        <div className="ambient-grain pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative z-10">
          <h2 className="font-display text-[32px] leading-tight text-snow">
            Part of Focalyst Pro
          </h2>
          <p className="mt-3 max-w-[620px] text-[15px] leading-[24px] text-snow/90">
            MCP will be available to Focalyst Pro members. Join the waitlist today and we will email you the moment early access opens.
          </p>
          <p className="mt-2 text-[13px] text-snow/75">
            Pro starts at $4.99 a month, or ₹99 in India.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToWaitlist}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-snow px-5 text-[14px] font-semibold text-[#0B2CB1] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Join the waitlist
            </button>
            <Link
              href={isSignedIn ? '/settings?tab=pro' : '/login?mode=signup'}
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-snow/30 bg-snow/10 px-5 text-[14px] font-semibold text-snow backdrop-blur-sm transition-colors hover:bg-snow/20"
            >
              See Pro plans
            </Link>
          </div>
        </div>
      </section>

      {/* Mini FAQ */}
      <section className="mx-auto mb-12 mt-20 max-w-[760px]">
        <h2 className="text-center font-display text-[28px] leading-[34px] text-ink">
          Frequently asked questions
        </h2>
        <div className="mt-6">
          <FaqAccordion items={MCP_FAQ} />
        </div>
      </section>
    </div>
  );
}
