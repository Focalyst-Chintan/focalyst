'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FAQ } from '@/content/faq';

export default function LandingClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preserve Capacitor native app redirect if running inside native shell
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor?.isNativePlatform?.()
    ) {
      router.replace('/login');
    }
  }, [router]);

  const homeFaqIndexes = [0, 1, 2, 6, 7]; // Entries 1, 2, 3, 7 and 8

  return (
    <div className="dark min-h-screen w-full bg-[#05070F] text-[#F2F5FF] font-ui selection:bg-[#1951FC] selection:text-snow overflow-x-hidden">
      {/* ================= HERO SECTION (100vh with hero.webp) ================= */}
      <section
        className="relative isolate flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#05070F]"
        style={{
          backgroundImage: "url('/landing/hero.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 58%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Background Image Layer */}
        <Image
          src="/landing/hero.webp"
          alt="Own your time. Build what matters."
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[center_58%] select-none"
        />

        {/* Subtle Vignette Overlay for Text Legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 12, 36, 0.42) 0%, rgba(4, 12, 36, 0.15) 32%, rgba(5, 7, 15, 0.05) 60%, rgba(5, 7, 15, 0.94) 100%)',
          }}
        />

        {/* ================= TOP NAVIGATION BAR ================= */}
        <header className="relative z-20 mx-auto flex w-full max-w-[1380px] items-center justify-between px-6 pt-6 lg:px-12">
          {/* Brand Wordmark */}
          <Link className="flex items-center gap-2.5 text-[22px] lg:text-[17px] font-semibold tracking-[-0.01em] lg:tracking-[0.04em] text-snow drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" href="/">
            <span className="hidden lg:inline-block h-4 w-[1.5px] bg-snow/60" />
            <span>Focalyst</span>
          </Link>

          {/* Desktop Center Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-medium text-snow/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
            <Link href="/app" className="transition-colors hover:text-snow">
              Features
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-snow">
              Pricing
            </Link>
            <Link href="/blog" className="transition-colors hover:text-snow">
              Blog
            </Link>
            <Link href="/mcp-preview" className="transition-colors hover:text-snow">
              MCP
            </Link>
            <Link href="/about" className="transition-colors hover:text-snow">
              About
            </Link>
          </nav>

          {/* Desktop Right Auth / App Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link className="text-[13.5px] font-medium text-snow/90 transition-colors hover:text-snow drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]" href={user ? '/today' : '/login'}>
              {user ? 'Open app' : 'Log in'}
            </Link>
            <span className="h-4 w-[1.5px] bg-snow/50" />
            <Link
              href="/start"
              className="rounded-full border border-snow/65 bg-snow/10 px-4 py-2 text-[13px] font-medium text-snow backdrop-blur-md transition-all hover:bg-snow/20"
            >
              Get started
            </Link>
          </div>

          {/* Mobile Right Controls: Hamburger Only */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-snow p-2 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </header>

        {/* Mobile Fullscreen Nav Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#05070F]/95 px-6 pt-24 pb-12 backdrop-blur-xl lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 right-6 text-snow p-2"
              aria-label="Close menu"
            >
              <X size={26} />
            </button>
            <nav className="flex flex-col gap-6 text-[20px] font-medium text-snow">
              <Link href="/app" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/blog" onClick={() => setMobileMenuOpen(false)}>
                Blog
              </Link>
              <Link href="/mcp-preview" onClick={() => setMobileMenuOpen(false)}>
                MCP
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <Link href="/help" onClick={() => setMobileMenuOpen(false)}>
                Help and FAQ
              </Link>
            </nav>
            <div className="flex flex-col gap-3">
              <Link
                href={user ? '/today' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-full border border-snow/30 text-snow text-[15px] font-medium"
              >
                {user ? 'Open app' : 'Log in'}
              </Link>
              <Link
                href="/start"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-full bg-snow text-[#05070F] text-[15px] font-semibold"
              >
                Get started
              </Link>
            </div>
          </div>
        )}

        {/* ================= HERO HEADLINE & CTA ================= */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-col items-center px-6 text-center mt-auto mb-16 lg:mb-20">
          <h1 className="font-display text-[44px] sm:text-[64px] lg:text-[76px] xl:text-[84px] leading-[1.02] tracking-[-0.02em] text-snow max-w-[1000px] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            Own your time.
            <br />
            <span className="italic font-normal">Build what matters.</span>
          </h1>

          <p className="mt-5 max-w-[620px] text-[16px] sm:text-[18px] lg:text-[19px] leading-[1.55] text-snow/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            A calm, all-in-one productivity hub. Plan your days, focus deeply,
            capture ideas and see how you grow.
          </p>

          {/* Desktop Only Buttons */}
          <div className="mt-8 hidden lg:flex items-center gap-4">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-snow/80 bg-snow/15 px-7 text-[15px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all hover:bg-snow hover:text-[#05070F] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
              href="/start"
            >
              Continue on Desktop
            </Link>
            <a
              href="https://focalyst.online/app"
              className="inline-flex h-12 items-center justify-center rounded-full border border-snow/60 bg-transparent px-7 text-[15px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all hover:bg-snow/15 hover:border-snow"
            >
              Download the App
            </a>
          </div>

          {/* Mobile-Only Buttons */}
          <div className="flex lg:hidden flex-col items-center gap-3.5 w-full max-w-[340px] mx-auto mt-6">
            <Link
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-snow/90 bg-snow/20 text-[16px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all hover:bg-snow hover:text-[#05070F]"
              href="/start"
            >
              Continue on Desktop
            </Link>
            <a
              href="https://focalyst.online/app"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-snow/90 bg-transparent text-[16px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all hover:bg-snow/15"
            >
              Download the App
            </a>
          </div>
        </div>

        {/* Bottom spacer for desktop */}
        <div className="hidden lg:block relative z-10 h-10" />
      </section>

      {/* ================= WHAT IS FOCALYST & AT A GLANCE (AI CRAWLER FRIENDLY) ================= */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pt-16 pb-12">
        <div className="rounded-[28px] border border-snow/10 bg-[#0B1020]/75 p-8 sm:p-12 backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
          <h2 className="font-display text-[32px] sm:text-[44px] leading-[1.1] text-snow">
            What is Focalyst?
          </h2>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-[1.65] text-[#A3ADC8] max-w-[800px]">
            Focalyst is an all-in-one productivity app that helps you plan your day, focus deeply and build lasting habits. It works on the web, iOS and Android, and it is free to start.
          </p>

          <div className="mt-8">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6FA4FF]">
              At a glance
            </h3>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[15px] leading-relaxed text-snow/90">
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>Tasks, calendar and countdowns to plan your days</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>A Pomodoro focus timer and app blocker for deep work</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>Habit tracking with streaks and accountability groups</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>Notes and voice notes with AI summaries</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>Focalyst AI and a weekly Catalyst Report that show how you are growing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#3781FC] mt-1 font-bold">•</span>
                <span>Free plan, with Pro from $4.99 a month or ₹99 in India</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/app"
              className="inline-flex h-11 items-center justify-center rounded-full bg-snow px-6 text-[14px] font-semibold text-[#05070F] transition-all hover:bg-snow/90"
            >
              See all features
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-full border border-snow/30 bg-snow/5 px-6 text-[14px] font-semibold text-snow backdrop-blur-md transition-all hover:bg-snow/15"
            >
              See pricing
            </Link>
          </div>

          {/* Common Questions */}
          <div className="mt-14 pt-10 border-t border-snow/10">
            <h2 className="font-display text-[26px] sm:text-[34px] leading-tight text-snow mb-6">
              Common questions
            </h2>
            <div className="space-y-4">
              {homeFaqIndexes.map((idx) => {
                const item = FAQ[idx];
                return (
                  <details
                    key={item.q}
                    className="group rounded-2xl border border-snow/10 bg-[#05070F]/60 p-5 transition-colors open:bg-[#05070F]/80"
                  >
                    <summary className="cursor-pointer text-[16px] font-semibold text-snow group-open:text-[#6FA4FF] transition-colors list-none flex items-center justify-between">
                      <span>{item.q}</span>
                      <span className="text-snow/50 group-open:rotate-45 transition-transform duration-200 text-lg">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-[#A3ADC8] border-t border-snow/10 pt-3">
                      {item.a}
                    </p>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= APP PREVIEW / FEATURES ================= */}
      <section id="features" className="relative z-10 mx-auto max-w-[1240px] px-6 -mt-6 lg:-mt-10 mb-20">
        <div className="glass-strong liquid rounded-[28px] p-3 sm:p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] border border-snow/15 overflow-hidden">
          <Image
            src="/landing/app-preview.webp"
            alt="Focalyst app preview"
            width={1600}
            height={950}
            sizes="(max-width: 1240px) 100vw, 1200px"
            className="w-full h-auto rounded-[20px] object-cover"
          />
        </div>
      </section>

      {/* ================= FOCALYST MCP WAITLIST & FOOTER ================= */}
      <section
        id="mcp"
        className="relative isolate overflow-hidden px-6 pt-20 pb-14"
        style={{
          background:
            'radial-gradient(65% 75% at 50% 35%, rgba(25, 81, 252, 0.24) 0%, rgba(11, 44, 177, 0.16) 45%, rgba(5, 7, 15, 1) 100%)',
        }}
      >
        {/* Waitlist Card */}
        <div className="mx-auto max-w-[880px] rounded-[28px] border border-snow/10 bg-[#0B1020]/75 p-8 sm:p-14 text-center backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
          <div className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
            FOCALYST MCP
          </div>

          <h2 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[54px] leading-[1.08] tracking-[-0.015em] text-snow">
            Your Focalyst, inside your AI.
          </h2>

          <p className="mx-auto mt-3 max-w-[540px] text-[14.5px] sm:text-[16px] leading-[1.6] text-[#A3ADC8]">
            Connect Claude, ChatGPT or Gemini to your tasks, habits, focus and notes. Included with Pro.
          </p>

          <div className="mt-7 flex justify-center">
            <Link
              href="/mcp-preview"
              className="inline-flex h-12 items-center justify-center rounded-full border border-snow/80 bg-snow/15 px-7 text-[15px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all hover:bg-snow hover:text-[#05070F] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Shared 4-Column Footer */}
        <footer className="mx-auto mt-24 max-w-[1200px] border-t border-snow/10 pt-16 text-snow">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.32em] text-snow">
                <Image src="/small-logo.png" alt="Focalyst" width={22} height={22} className="h-[22px] w-[22px] rounded-[5px]" />
                <span>FOCALYST</span>
              </div>
              <p className="mt-3 font-display text-[22px] text-snow">Own your time.</p>
              <p className="mt-1 text-[13px] text-snow/60">Focalyst by Chintan · Kolkata, India</p>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-snow/60">Product</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-snow/80">
                <li><Link href="/app" className="hover:text-snow">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-snow">Pricing</Link></li>
                <li><Link href="/mcp-preview" className="hover:text-snow">MCP</Link></li>
                <li><Link href="/blog" className="hover:text-snow">Blog</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-snow/60">Company</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-snow/80">
                <li><Link href="/about" className="hover:text-snow">About</Link></li>
                <li><Link href="/contact" className="hover:text-snow">Contact</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-snow/60">Support</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-snow/80">
                <li><Link href="/help" className="hover:text-snow">Help and FAQ</Link></li>
                <li><Link href="/privacy" className="hover:text-snow">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-snow">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-snow/10 pt-6 text-[13px] text-snow/60">
            © 2026 Focalyst by Chintan. All rights reserved.
          </div>
        </footer>
      </section>
    </div>
  );
}
