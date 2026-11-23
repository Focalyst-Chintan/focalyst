import type { Metadata } from 'next';
import Link from 'next/link';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { EditorialNav } from '@/components/desktop/product-overview/EditorialNav';
import { PhoneMockup } from '@/components/desktop/product-overview/PhoneMockup';
import { StatusBadge } from '@/components/desktop/product-overview/StatusBadge';
import { TableOfContents } from '@/components/desktop/product-overview/TableOfContents';
import { ConnectedExperienceShowcase } from '@/components/desktop/product-overview/ConnectedExperienceShowcase';
import { ProductDemoShowcase } from '@/components/desktop/product-overview/ProductDemoShowcase';
import { IntelligenceShowcase } from '@/components/desktop/product-overview/IntelligenceShowcase';
import { McpWorkflowExample } from '@/components/desktop/product-overview/McpWorkflowExample';
import { WrappedDemoShowcase } from '@/components/desktop/product-overview/WrappedDemoShowcase';
import { MEDIA_MANIFEST } from '@/components/desktop/product-overview/mediaManifest';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: {
    absolute: 'Product & Design Overview | Focalyst',
  },
  description:
    'A product and design dossier for Focalyst. Explore how planning, focus, habits, notes, and productivity intelligence come together in one calm experience.',
  alternates: {
    canonical: 'https://focalyst.online/product-overview',
  },
  openGraph: {
    title: 'Product & Design Overview | Focalyst',
    description:
      'A product and design dossier for Focalyst. Explore how planning, focus, habits, notes, and productivity intelligence come together in one calm experience.',
    url: 'https://focalyst.online/product-overview',
    siteName: 'Focalyst',
    type: 'article',
    images: [
      {
        url: '/product-overview/plan-tab-new.png',
        width: 1080,
        height: 1920,
        alt: 'Focalyst Plan tab on iPhone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Product & Design Overview | Focalyst',
    description:
      'A product and design dossier for Focalyst. Explore how planning, focus, habits, notes, and productivity intelligence come together in one calm experience.',
    images: ['/product-overview/plan-tab-new.png'],
  },
};

const CADENCE_STEPS = [
  { numeral: '01', title: 'Plan your day', detail: 'Tasks, priorities, and schedule in one place.' },
  { numeral: '02', title: 'Protect your focus', detail: 'Timed deep work blocks free from distraction.' },
  { numeral: '03', title: 'Build consistency', detail: 'Repeatable habits reinforced over time.' },
  { numeral: '04', title: 'Understand progress', detail: 'Meaningful activity insights and reflection.' },
];

const PHILOSOPHY_PRINCIPLES = [
  {
    numeral: '01',
    title: 'Simplicity over setup',
    body: 'Users should be able to start organising their lives immediately, without building complicated workflows or databases.',
  },
  {
    numeral: '02',
    title: 'Focus over distraction',
    body: 'Technology should help people protect their attention rather than compete for it.',
  },
  {
    numeral: '03',
    title: 'Consistency over perfection',
    body: 'Small, repeatable actions matter more than occasional bursts of productivity.',
  },
  {
    numeral: '04',
    title: 'Insights over assumptions',
    body: 'Users should understand their productivity through meaningful activity data and actionable feedback.',
  },
  {
    numeral: '05',
    title: 'Growth through accountability',
    body: 'Personal improvement becomes more engaging when people can support and motivate one another.',
  },
];

const CONNECTED_LAYERS = [
  {
    title: 'Productivity analytics and weekly reports',
    description:
      'Clear activity summaries and automated weekly reports help users spot patterns in focus time and habit completion.',
  },
  {
    title: 'AI-powered productivity assistance',
    description:
      'A context-aware assistant helps structure plans, review progress, and turn scattered thoughts into clear next steps.',
  },
  {
    title: 'XP, levels, badges and streaks',
    description:
      'Restrained milestone progression rewards steady effort and makes daily consistency tangible over months.',
  },
];

const TOKEN_SWATCHES = [
  { name: 'Primary', token: 'bg-primary', role: 'Filled actions and progress' },
  { name: 'Primary hover', token: 'bg-primary-hover', role: 'Interactive emphasis' },
  { name: 'Primary soft', token: 'bg-primary-soft border border-line', role: 'Tinted chips and status' },
  { name: 'Canvas', token: 'bg-canvas border border-line-strong', role: 'Base atmospheric layer' },
  { name: 'Surface', token: 'bg-surface border border-line-strong', role: 'Content elevation' },
  { name: 'Ink', token: 'bg-ink', role: 'Primary typographic contrast' },
];

export default function ProductOverviewPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip font-ui text-ink">
      <AmbientBackground />
      <EditorialNav />

      <main className="relative z-10 mx-auto max-w-[1320px] px-5 pt-10 pb-24 sm:px-8 sm:pt-14 sm:pb-32">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-14">
          <div className="min-w-0 space-y-20 sm:space-y-28">
            {/* Hero / Cover (Product Vision) */}
            <section aria-labelledby="hero-heading" className="space-y-10 sm:space-y-12">
              <div className="mx-auto max-w-[780px] space-y-6 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  FOCALYST · PRODUCT &amp; DESIGN
                </p>
                <h1
                  id="hero-heading"
                  className="font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-ink sm:text-[64px] lg:text-[76px]"
                >
                  A more connected approach to personal{' '}
                  <span className="italic text-primary-text">productivity</span>.
                </h1>
                <div className="mx-auto max-w-[650px] space-y-4 text-[16px] leading-[26px] text-ink-2 sm:text-[17px] sm:leading-[28px]">
                  <p>
                    Focalyst is built around a simple belief: becoming more productive should not
                    require spending hours organising productivity tools.
                  </p>
                  <p>
                    People should not have to build complicated databases, configure multiple
                    applications, or constantly switch between platforms just to manage their
                    everyday lives. Focalyst brings planning, focus, habits, notes, accountability,
                    and productivity intelligence into one cohesive experience.
                  </p>
                  <p className="font-medium text-ink">
                    Our mission is to help people own their time and make consistent progress
                    towards what matters.
                  </p>
                </div>
              </div>

              {/* 3-Phone Editorial Stage */}
              <div
                className="relative overflow-hidden rounded-[28px] border border-snow/10 px-4 pt-10 pb-6 shadow-[var(--shadow-glass)] sm:px-10 sm:pt-14 sm:pb-8"
                style={{
                  background:
                    'radial-gradient(120% 100% at 50% 0%, #1951FC 0%, #0B2CB1 46%, #03195B 100%)',
                }}
              >
                <div className="ambient-grain pointer-events-none" />
                <div className="relative z-10 mx-auto flex max-w-[920px] items-end justify-center gap-3 sm:gap-6 lg:gap-8">
                  {/* Left flanked phone (subtle side peek on mobile, full view on sm+) */}
                  <div className="-ml-16 w-[44%] shrink-0 translate-y-4 opacity-85 sm:ml-0 sm:w-[27%] sm:translate-y-5 sm:opacity-95">
                    <PhoneMockup
                      media={MEDIA_MANIFEST.focusTab}
                      sizes="(max-width: 640px) 170px, 240px"
                    />
                  </div>

                  {/* Center hero phone */}
                  <div className="z-20 w-[56%] shrink-0 sm:w-[32%]">
                    <PhoneMockup
                      media={MEDIA_MANIFEST.planTab}
                      priority
                      sizes="(max-width: 640px) 220px, 290px"
                    />
                  </div>

                  {/* Right flanked phone */}
                  <div className="-mr-16 w-[44%] shrink-0 translate-y-4 opacity-85 sm:mr-0 sm:w-[27%] sm:translate-y-5 sm:opacity-95">
                    <PhoneMockup
                      media={MEDIA_MANIFEST.insightsTab}
                      sizes="(max-width: 640px) 170px, 240px"
                    />
                  </div>
                </div>
              </div>

              {/* Concise Editorial Metadata Bar */}
              <dl className="frost grid grid-cols-1 divide-y divide-line px-6 py-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="py-2 sm:py-0 sm:pr-6">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    Platform
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium text-ink">iOS, Android &amp; Web</dd>
                </div>
                <div className="py-2 sm:px-6 sm:py-0">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    Category
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium text-ink">Personal Productivity</dd>
                </div>
                <div className="py-2 sm:py-0 sm:pl-6">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    Design
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium text-ink">
                    Dark-first, Calm Utility
                  </dd>
                </div>
              </dl>
            </section>

            {/* The Problem & Daily Cadence */}
            <section id="problem" aria-labelledby="problem-heading" className="scroll-mt-24 space-y-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="frost p-6 sm:p-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    The fragmented default
                  </p>
                  <h2
                    id="problem-heading"
                    className="mt-2 font-display text-[28px] leading-[34px] tracking-[-0.015em] text-ink sm:text-[32px] sm:leading-[38px]"
                  >
                    Too many tools, too little momentum
                  </h2>
                  <p className="mt-3 text-[15px] leading-[24px] text-ink-2">
                    Most productivity setups fracture across separate calendars, task lists, timer
                    apps, note folders, and habit trackers. Maintaining the system starts taking
                    more energy than doing the work itself.
                  </p>
                </div>

                <div className="frost p-6 sm:p-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                    One unified system
                  </p>
                  <h3 className="mt-2 font-display text-[28px] leading-[34px] tracking-[-0.015em] text-ink sm:text-[32px] sm:leading-[38px]">
                    Designed around a daily rhythm
                  </h3>
                  <p className="mt-3 text-[15px] leading-[24px] text-ink-2">
                    Focalyst replaces tool-switching with a single connected workspace. Planning,
                    focused execution, habit building, and reflection reinforce each other
                    naturally throughout the day.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CADENCE_STEPS.map((step) => (
                  <div key={step.numeral} className="frost p-5">
                    <span className="tabular-nums text-[12px] font-semibold tracking-[0.06em] text-primary-text">
                      {step.numeral}
                    </span>
                    <h3 className="mt-2 text-[15px] font-semibold leading-[22px] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-[20px] text-ink-2">{step.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 01: The Product Philosophy */}
            <section
              id="philosophy"
              aria-labelledby="philosophy-heading"
              className="scroll-mt-24 space-y-8"
            >
              <div className="space-y-2">
                <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  01
                </p>
                <h2
                  id="philosophy-heading"
                  className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                >
                  The product philosophy
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {PHILOSOPHY_PRINCIPLES.map((principle, idx) => (
                  <article
                    key={principle.numeral}
                    className={`frost p-6 sm:p-7 ${
                      idx === PHILOSOPHY_PRINCIPLES.length - 1 ? 'md:col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-[12px] font-semibold text-primary-text">
                        {principle.numeral}
                      </span>
                      <span aria-hidden className="h-px flex-1 bg-line" />
                    </div>
                    <h3 className="mt-4 text-[17px] font-semibold leading-[24px] text-ink">
                      {principle.title}
                    </h3>
                    <p className="mt-2 max-w-[68ch] text-[14px] leading-[22px] text-ink-2">
                      {principle.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Section 02: A Connected Productivity Experience */}
            <section
              id="experience"
              aria-labelledby="experience-heading"
              className="scroll-mt-24 space-y-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                    02
                  </p>
                  <h2
                    id="experience-heading"
                    className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                  >
                    A connected productivity experience
                  </h2>
                </div>
                <StatusBadge variant="available" />
              </div>

              <ConnectedExperienceShowcase />

              {/* Remaining Connected Layers */}
              <div className="space-y-5 pt-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  Additional connected layers
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {CONNECTED_LAYERS.map((layer) => (
                    <div key={layer.title} className="frost p-5 sm:p-6">
                      <h3 className="text-[15px] font-semibold leading-[22px] text-ink">
                        {layer.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
                        {layer.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[15px] leading-[24px] text-ink-2">
                  Each experience contributes to a larger goal: helping users plan, act, reflect,
                  and improve.
                </p>
              </div>
            </section>

            {/* Section 03: Design and User Experience */}
            <section id="design" aria-labelledby="design-heading" className="scroll-mt-24 space-y-8">
              <div className="space-y-2">
                <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  03
                </p>
                <h2
                  id="design-heading"
                  className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                >
                  Design and user experience
                </h2>
              </div>

              <div className="max-w-[70ch] space-y-4 text-[15px] leading-[25px] text-ink-2">
                <p>
                  Focalyst is designed with a modern, minimal, dark-first visual direction that
                  treats calm utility as a core feature. Rather than competing for attention with
                  bright badges or dense chrome, every surface uses a consistent visual language
                  and clear information hierarchy.
                </p>
                <p>
                  Rounded surfaces, generous spacing, focused layouts, and approachable navigation
                  keep complex daily workflows feeling lightweight across iPhone, Android, and
                  desktop.
                </p>
              </div>

              {/* Part 1: Two-part visual craft showcase (widgets + voice note) */}
              <div className="frost p-5 sm:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
                  <div className="flex flex-col justify-between gap-6">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                        System integration
                      </p>
                      <h3 className="text-[18px] font-semibold leading-[26px] text-ink">
                        Native iOS Home Screen harmony
                      </h3>
                      <p className="text-[14px] leading-[22px] text-ink-2">
                        Widgets bring calendar blocks, daily tasks, event countdowns, and habit
                        heatmaps directly to the Home Screen so progress stays visible without
                        opening the app.
                      </p>
                    </div>
                    <div className="mx-auto w-full max-w-[260px]">
                      <PhoneMockup
                        media={MEDIA_MANIFEST.widgets}
                        showCaption
                        sizes="(max-width: 640px) 220px, 260px"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-6 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                        Interaction craft
                      </p>
                      <h3 className="text-[18px] font-semibold leading-[26px] text-ink">
                        Tactile, distraction-free surfaces
                      </h3>
                      <p className="text-[14px] leading-[22px] text-ink-2">
                        Focused interaction states, such as the live audio waveform and real-time
                        transcription view, pair crisp typographic hierarchy with quiet visual
                        feedback.
                      </p>
                    </div>
                    <div className="mx-auto w-full max-w-[260px]">
                      <PhoneMockup
                        media={MEDIA_MANIFEST.voiceNote}
                        showCaption
                        sizes="(max-width: 640px) 220px, 260px"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Compact Visual System Card */}
              <div className="frost p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      Visual system
                    </p>
                    <h3 className="text-[18px] font-semibold leading-[26px] text-ink">
                      Palette, typography, and depth
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Brand Ramp (CSS tokens only) */}
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-ink">Semantic token ramp</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {TOKEN_SWATCHES.map((swatch) => (
                          <div
                            key={swatch.name}
                            className="flex items-center gap-2.5 rounded-[12px] border border-line bg-surface-2/60 p-2"
                          >
                            <span
                              aria-hidden
                              className={`h-6 w-6 shrink-0 rounded-[8px] ${swatch.token}`}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-ink">
                                {swatch.name}
                              </p>
                              <p className="truncate text-[11px] text-ink-3">{swatch.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typography Pairing */}
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-ink">Typography pairing</p>
                      <div className="space-y-3 rounded-[14px] border border-line bg-surface-2/60 p-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
                            Display
                          </p>
                          <p className="mt-0.5 font-display text-[26px] leading-[30px] text-ink">
                            Instrument Serif
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-2">
                            Editorial headings, greetings, and calm emphasis.
                          </p>
                        </div>
                        <div className="border-t border-line pt-3">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
                            Interface
                          </p>
                          <p className="mt-0.5 text-[16px] font-semibold text-ink">Inter</p>
                          <p className="mt-0.5 text-[12px] text-ink-2">
                            Controls, body copy, and tabular numerals.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Three-Layer Depth Model */}
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-ink">Three-layer depth model</p>
                      <div className="space-y-2.5">
                        <div className="rounded-[12px] border border-line bg-surface-2/60 px-3.5 py-2.5">
                          <p className="text-[12px] font-semibold text-ink">1. Ambient</p>
                          <p className="text-[12px] text-ink-2">
                            Soft brand-blue gradients and fine grain behind the canvas.
                          </p>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-2/60 px-3.5 py-2.5">
                          <p className="text-[12px] font-semibold text-ink">2. Glass Chrome</p>
                          <p className="text-[12px] text-ink-2">
                            Translucent navigation bars, overlays, and floating controls.
                          </p>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-2/60 px-3.5 py-2.5">
                          <p className="text-[12px] font-semibold text-ink">3. Frost Content</p>
                          <p className="text-[12px] text-ink-2">
                            Near-opaque cards with hairline borders for crisp legibility.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Interactive Day-in-the-Life Walkthrough */}
            <ProductDemoShowcase />

            {/* Section 04: Productivity That Adapts to the User */}
            <section
              id="intelligence"
              aria-labelledby="intelligence-heading"
              className="scroll-mt-24 space-y-10"
            >
              <div className="space-y-2">
                <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  04
                </p>
                <h2
                  id="intelligence-heading"
                  className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                >
                  Productivity that adapts to the user
                </h2>
              </div>

              {/* Part A: Integrated AI Assistant & Weekly Catalyst Reports */}
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-[68ch] space-y-2">
                    <h3 className="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink">
                      Integrated AI assistant and weekly Catalyst reports
                    </h3>
                    <p className="text-[15px] leading-[24px] text-ink-2">
                      Focalyst helps users understand task completion, focus activity, habits,
                      strengths, and opportunities for improvement without manual spreadsheets or
                      disconnected analytics tools.
                    </p>
                  </div>
                  <StatusBadge variant="available" />
                </div>

                <IntelligenceShowcase />
              </div>

              {/* Part B: MCP (Model Context Protocol) Support */}
              <div className="space-y-6 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-[68ch] space-y-2">
                    <h3 className="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink">
                      MCP (Model Context Protocol) support
                    </h3>
                    <p className="text-[15px] leading-[24px] text-ink-2">
                      Users can optionally connect compatible external LLMs to explore their
                      productivity data in their preferred AI tools while remaining in control of
                      their data.
                    </p>
                  </div>
                  <StatusBadge variant="development" />
                </div>

                <McpWorkflowExample />
              </div>
            </section>

            {/* Section 05: Making Self-Improvement Engaging */}
            <section
              id="accountability"
              aria-labelledby="accountability-heading"
              className="scroll-mt-24 space-y-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                    05
                  </p>
                  <h2
                    id="accountability-heading"
                    className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                  >
                    Making self-improvement engaging
                  </h2>
                </div>
                <StatusBadge variant="available" />
              </div>

              <p className="max-w-[70ch] text-[15px] leading-[25px] text-ink-2">
                Consistency is easier to sustain when effort feels tangible. Focalyst pairs
                experience points, levels, milestone badges, and habit streaks with shared habit
                groups that turn solo discipline into supportive accountability.
              </p>

              {/* Dual Floating Mockup Showcase */}
              <div className="frost p-6 sm:p-10">
                <div className="mx-auto grid max-w-[760px] grid-cols-1 items-start gap-10 sm:grid-cols-2 sm:gap-12">
                  <div className="mx-auto w-full max-w-[260px] py-2">
                    <PhoneMockup
                      media={MEDIA_MANIFEST.habitLeaderboard}
                      showCaption
                      caption="Shared habit groups"
                      sizes="(max-width: 640px) 240px, 260px"
                    />
                  </div>
                  <div className="mx-auto w-full max-w-[260px] py-2">
                    <PhoneMockup
                      media={MEDIA_MANIFEST.badges}
                      showCaption
                      caption="Milestone badges & levels"
                      sizes="(max-width: 640px) 240px, 260px"
                    />
                  </div>
                </div>
              </div>

              {/* Four Concise Highlight Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="frost p-5">
                  <h3 className="text-[15px] font-semibold leading-[22px] text-ink">
                    Experience points
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
                    Every completed task, focus block, and habit check-in contributes measurable
                    momentum.
                  </p>
                </div>
                <div className="frost p-5">
                  <h3 className="text-[15px] font-semibold leading-[22px] text-ink">
                    Levels &amp; badges
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
                    Restrained milestone progression celebrates consistency over weeks and months.
                  </p>
                </div>
                <div className="frost p-5">
                  <h3 className="text-[15px] font-semibold leading-[22px] text-ink">
                    Habit streaks
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
                    Visual streaks reinforce daily follow-through without punitive pressure.
                  </p>
                </div>
                <div className="frost p-5">
                  <h3 className="text-[15px] font-semibold leading-[22px] text-ink">
                    Shared habit groups
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
                    Small accountability circles keep friends and teams aligned on shared routines.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 06: Looking Ahead */}
            <section
              id="roadmap"
              aria-labelledby="roadmap-heading"
              className="scroll-mt-24 space-y-8"
            >
              <div className="space-y-2">
                <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  06
                </p>
                <h2
                  id="roadmap-heading"
                  className="font-display text-[36px] leading-[42px] tracking-[-0.015em] text-ink sm:text-[44px] sm:leading-[48px]"
                >
                  Looking ahead
                </h2>
              </div>

              {/* Focalyst Wrapped Video Preview Showcase */}
              <WrappedDemoShowcase />

              {/* Released vs Planned Clarity Ledger */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="frost p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-semibold leading-[26px] text-ink">
                      Shipped today
                    </h3>
                    <StatusBadge variant="available" />
                  </div>
                  <ul className="space-y-2.5 text-[14px] leading-[22px] text-ink-2">
                    {[
                      'Cross-platform sync across iOS, Android & Web',
                      'Daily planning & tasks',
                      'Habit tracking & heatmaps',
                      'Customisable focus timer & distraction blocking',
                      'Notes & voice transcription',
                      'Home screen widgets & countdowns',
                      'Productivity insights, AI assistant & Catalyst weekly reports',
                      'XP, levels, badges & shared habit groups',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="frost p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-semibold leading-[26px] text-ink">
                      Upcoming initiatives
                    </h3>
                    <StatusBadge variant="planned" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[14px] border border-line bg-surface-2/60 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-ink">
                          Optional MCP connectivity for external LLMs
                        </p>
                        <StatusBadge variant="development" />
                      </div>
                      <p className="text-[13px] leading-[20px] text-ink-2">
                        Allow users to connect compatible external AI tools to query their own
                        Focalyst tasks, focus logs, and habits with explicit permission.
                      </p>
                    </div>

                    <div className="rounded-[14px] border border-line bg-surface-2/60 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-ink">
                          Focalyst Wrapped annual retrospective
                        </p>
                        <StatusBadge variant="planned" />
                      </div>
                      <p className="text-[13px] leading-[20px] text-ink-2">
                        A calm year-in-review summary reflecting total focus hours, completed
                        habits, and personal milestones across the year.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Closing: Our Vision */}
            <section
              id="vision"
              aria-labelledby="vision-heading"
              className="scroll-mt-24 pt-6 pb-8 text-center"
            >
              <div className="mx-auto max-w-[680px] space-y-6">
                <p
                  id="vision-heading"
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text"
                >
                  OUR VISION
                </p>
                <p className="font-display text-[30px] leading-[38px] tracking-[-0.015em] text-ink sm:text-[38px] sm:leading-[46px]">
                  Focalyst is more than a collection of productivity tools. It is a connected system
                  designed to help people take ownership of their time, build better routines, and
                  make meaningful progress.
                </p>
                <p className="text-[15px] font-medium text-ink-2">
                  Focalyst. Own your time.
                </p>
              </div>
            </section>

            {/* Minimal Editorial Footer */}
            <footer className="border-t border-line pt-8 text-[13px] text-ink-3">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="font-semibold tracking-[0.28em] text-ink transition-colors hover:text-primary-text focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    FOCALYST
                  </Link>
                  <span>© 2026 Focalyst</span>
                </div>

                <nav aria-label="Footer links" className="flex flex-wrap items-center gap-5">
                  <Link
                    href="/"
                    className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    Home
                  </Link>
                  <Link
                    href="/blog"
                    className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    Blog
                  </Link>
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/contact"
                    className="transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[6px]"
                  >
                    Contact
                  </Link>
                </nav>
              </div>
            </footer>
          </div>

          {/* Sticky Right-Rail Editorial Index (>= 1280px) */}
          <TableOfContents />
        </div>
      </main>
    </div>
  );
}
