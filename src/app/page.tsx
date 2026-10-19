'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CalendarCheck2, Timer, ChartColumn, Sparkles, CheckCircle2, Flame } from 'lucide-react';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Capacitor / Native preservation
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      if (user) {
        router.replace('/today');
      } else {
        router.replace('/login');
      }
    }
  }, [user, router]);

  return (
    <div className="relative min-h-screen bg-canvas font-ui selection:bg-primary/20 selection:text-primary">
      {/* =========================================================================
          HERO SECTION (100vh, always dark)
          ========================================================================= */}
      <section className="relative h-screen w-full overflow-hidden bg-[#05070F] text-snow">
        {/* Background Image */}
        <Image
          src="/landing/hero.png"
          alt="Focalyst Hero"
          fill
          priority
          className="object-cover object-[center_60%] select-none pointer-events-none"
        />

        {/* Top Gradient Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-[#03195B]/35 to-transparent z-10"
        />

        {/* Bottom Gradient Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-[#05070F]/55 z-10"
        />

        {/* Top Nav */}
        <header className="absolute top-6 inset-x-0 mx-auto max-w-[1280px] px-8 flex items-center justify-between z-20">
          {/* Wordmark */}
          <Link
            href="/"
            className="font-ui font-bold text-[16px] tracking-wide text-snow hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span>Focalyst</span>
          </Link>

          {/* Center Links */}
          <nav className="hidden sm:flex items-center gap-8">
            <a
              href="#features"
              className="text-[14px] text-snow/80 hover:text-snow transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#mcp"
              className="text-[14px] text-snow/80 hover:text-snow transition-colors font-medium"
            >
              MCP
            </a>
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[14px] text-snow/80 hover:text-snow transition-colors font-medium"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="glass liquid text-snow text-[14px] font-medium px-5 h-10 rounded-full inline-flex items-center justify-center hover:opacity-95 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Centered Hero Content */}
        <div className="relative z-20 flex flex-col items-center justify-center h-full pt-[12vh] px-6 text-center max-w-[960px] mx-auto">
          {/* Headline */}
          <h1
            className="font-display text-[clamp(52px,6.2vw,104px)] leading-[1.02] tracking-[-0.02em] text-snow animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out"
          >
            Own your time. Build what <em className="italic font-normal">matters</em>.
          </h1>

          {/* Subtext */}
          <p
            className="mt-5 max-w-[640px] text-[18px]/[28px] sm:text-[19px]/[30px] text-snow/85 font-ui animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 ease-out fill-mode-both"
          >
            Turn your ambitions into action with AI-powered planning, focused work
            sessions, and habits that move you forward.
          </p>

          {/* CTA Block */}
          <div className="mt-9 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200 ease-out fill-mode-both">
            <Link
              href="/login?mode=signup"
              className="glass liquid h-[52px] px-8 rounded-full inline-flex items-center justify-center text-[15px] font-semibold text-snow shadow-[var(--shadow-glass)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="text-[14px] text-snow/70 hover:text-snow transition-colors mt-1 font-medium"
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* Scroll Micro Indicator */}
        <div className="absolute bottom-6 inset-x-0 mx-auto flex flex-col items-center gap-2 z-20 pointer-events-none">
          <span className="text-[11px] uppercase tracking-[0.08em] text-snow/70 font-medium">
            Scroll
          </span>
          <div className="w-[1px] h-6 bg-gradient-to-b from-snow/60 to-transparent animate-pulse" />
        </div>
      </section>

      {/* =========================================================================
          BELOW THE HERO (Theme-aware with AmbientBackground)
          ========================================================================= */}
      <div className="relative z-10">
        <AmbientBackground />

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 px-6 max-w-[1280px] mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-[680px] mx-auto">
            <h2 className="font-display text-[32px]/[38px] sm:text-[44px]/[48px] text-ink">
              Everything you need to focus. Nothing you don&apos;t.
            </h2>
            <p className="mt-3 text-[16px] text-ink-2">
              A calm, unified interface designed for sustained deep work and intentional living.
            </p>
          </div>

          {/* Product Peek Frame */}
          <div className="mt-14 max-w-[1080px] mx-auto">
            <div className="glass liquid rounded-[28px] p-3 sm:p-4 shadow-[var(--shadow-glass)] transition-all duration-700 ease-out hover:[transform:perspective(1200px)_rotateX(0deg)] [transform:perspective(1200px)_rotateX(6deg)]">
              {/* Frost Dashboard Preview Placeholder */}
              <div className="frost rounded-[20px] p-6 sm:p-8 bg-surface/90 border border-line">
                <div className="flex items-center justify-between pb-6 border-b border-line">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-danger/80" />
                    <div className="h-3 w-3 rounded-full bg-warning/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="text-[12px] font-mono text-ink-3 ml-2 font-medium">
                      focalyst.online/today
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-primary-text bg-primary-soft px-3 py-1 rounded-full">
                      Good morning
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-6">
                  {/* Focus Card Preview */}
                  <div className="md:col-span-5 rounded-[20px] p-6 bg-gradient-to-br from-[#1951FC] via-[#0B2CB1] to-[#03195B] text-snow relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                    <div>
                      <span className="text-[12px] font-medium uppercase tracking-wider text-snow/75">
                        Focus Today
                      </span>
                      <div className="font-display text-[44px] leading-tight mt-1 text-snow">
                        2h 15m
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[13px] text-snow/80">Daily goal: 3h</span>
                      <span className="glass px-3 py-1 rounded-full text-[12px] font-medium text-snow">
                        75% complete
                      </span>
                    </div>
                  </div>

                  {/* Habits Card Preview */}
                  <div className="md:col-span-4 rounded-[20px] p-5 bg-surface-2 border border-line flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[14px] font-semibold text-ink">Habits</span>
                        <span className="text-[12px] text-ink-3 font-medium">3 of 5</span>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { name: 'Morning meditation', done: true, streak: 14 },
                          { name: 'Deep work block', done: true, streak: 8 },
                          { name: 'Evening read', done: false, streak: 5 },
                        ].map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-xl bg-surface border border-line"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`flex h-4 w-4 rounded-full items-center justify-center ${
                                  h.done ? 'bg-primary text-snow' : 'border border-line-strong'
                                }`}
                              >
                                {h.done && <CheckCircle2 className="h-3 w-3" />}
                              </span>
                              <span
                                className={`text-[13px] font-medium ${
                                  h.done ? 'text-ink-2 line-through' : 'text-ink'
                                }`}
                              >
                                {h.name}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                              <Flame className="h-3 w-3" /> {h.streak}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant Preview */}
                  <div className="md:col-span-3 rounded-[20px] p-5 bg-surface-2 border border-line flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary-text mb-3">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-[13px] font-semibold">Focalyst AI</span>
                      </div>
                      <p className="text-[13px] text-ink-2 leading-relaxed">
                        &ldquo;You completed 84% of planned tasks this week. Your highest focus peak is at 10 AM.&rdquo;
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line text-[11px] text-ink-3">
                      Ask AI anything with <kbd className="font-mono bg-surface px-1 py-0.5 rounded border border-line">⌘J</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 max-w-[1080px] mx-auto">
            {/* 1. Plan */}
            <div className="frost p-6 rounded-[24px] border border-line bg-surface/80 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-text mb-5">
                <CalendarCheck2 className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Plan</h3>
              <p className="mt-2 text-[15px]/[24px] text-ink-2">
                Habits, tasks and reminders in one calm place.
              </p>
            </div>

            {/* 2. Focus */}
            <div className="frost p-6 rounded-[24px] border border-line bg-surface/80 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-text mb-5">
                <Timer className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Focus</h3>
              <p className="mt-2 text-[15px]/[24px] text-ink-2">
                Deep work sessions that actually get saved.
              </p>
            </div>

            {/* 3. Reflect */}
            <div className="frost p-6 rounded-[24px] border border-line bg-surface/80 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-text mb-5">
                <ChartColumn className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Reflect</h3>
              <p className="mt-2 text-[15px]/[24px] text-ink-2">
                Weekly insights that show what&apos;s working.
              </p>
            </div>
          </div>
        </section>

        {/* MCP STRIP */}
        <section id="mcp" className="px-6 pb-24">
          <div className="glass liquid rounded-[28px] p-8 sm:p-14 text-center max-w-[960px] mx-auto shadow-[var(--shadow-glass)]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text bg-primary-soft px-3 py-1 rounded-full">
              FOCALYST LABS
            </span>
            <h2 className="font-display text-[32px]/[38px] sm:text-[42px]/[46px] text-ink mt-4">
              Your Focalyst, inside your AI.
            </h2>
            <p className="text-[15px]/[24px] sm:text-[16px]/[26px] text-ink-2 max-w-[540px] mx-auto mt-3 mb-8">
              Connect your habits, tasks and focus sessions to the AI assistants you already use.
            </p>

            <div className="max-w-[520px] mx-auto">
              <KitWaitlist />
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-line py-12 max-w-[1280px] mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[13px] text-ink-3">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <span className="font-ui font-bold text-[15px] tracking-wide text-ink">
              Focalyst
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <a href="#features" className="hover:text-ink transition-colors">
                About
              </a>
              <Link href="/privacy" className="hover:text-ink transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-ink transition-colors">
                Terms of Service
              </Link>
              <a
                href="mailto:support@focalyst.online?subject=Help%20%26%20FAQ"
                className="hover:text-ink transition-colors"
              >
                Help & FAQ
              </a>
              <a
                href="mailto:support@focalyst.online"
                className="hover:text-ink transition-colors"
              >
                Contact Us
              </a>
              <a href="#mcp" className="hover:text-ink transition-colors">
                Download the App
              </a>
            </div>
          </div>
          <div className="shrink-0 text-center md:text-right">
            &copy; 2026 Focalyst. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
