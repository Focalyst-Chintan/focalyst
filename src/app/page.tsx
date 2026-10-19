'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';

export default function LandingPage() {
  const router = useRouter();

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

  return (
    <div className="dark min-h-screen w-full bg-[#05070F] text-[#F2F5FF] font-ui selection:bg-[#1951FC] selection:text-white overflow-x-hidden">
      {/* ================= HERO SECTION (100vh with hero.png) ================= */}
      <section
        className="relative isolate flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#05070F]"
        style={{
          backgroundImage: "url('/landing/hero.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 58%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Background Image Layer */}
        <img
          src="/landing/hero.png"
          alt="Own your time. Build what matters."
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[center_58%] select-none"
        />

        {/* Subtle Cinematic Vignette (keeps sky & flower field vivid while ensuring crisp white text & smooth bottom blend) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 12, 36, 0.38) 0%, rgba(4, 12, 36, 0.16) 38%, rgba(5, 7, 15, 0.08) 68%, rgba(5, 7, 15, 0.92) 100%)',
          }}
        />

        {/* Top Navigation Bar */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1380px] items-center justify-between px-6 pt-7 lg:px-12">
          {/* Left Brand Wordmark with subtle vertical bar */}
          <Link className="flex items-center gap-3 text-[16px] font-semibold tracking-[0.04em] text-snow drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]" href="/">
            <span className="h-4 w-[1.5px] bg-snow/60" />
            <span>Focalyst</span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-medium text-snow/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
            <a
              href="https://focalyst.online/app"
              className="transition-colors hover:text-snow"
            >
              Features
            </a>
            <a href="#mcp" className="transition-colors hover:text-snow">
              MCP
            </a>
            <a
              href="https://focalyst.online/app"
              className="transition-colors hover:text-snow"
            >
              About
            </a>
            <Link className="transition-colors hover:text-snow" href="/help">
              Help &amp; FAQ
            </Link>
            <Link className="transition-colors hover:text-snow" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="transition-colors hover:text-snow" href="/terms">
              Terms of Service
            </Link>
            <a
              href="mailto:support@focalyst.online"
              className="transition-colors hover:text-snow"
            >
              Contact Us
            </a>
          </nav>

          {/* Right Auth / App Actions */}
          <div className="flex items-center gap-4">
            <Link className="text-[13.5px] font-medium text-snow/90 transition-colors hover:text-snow drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]" href="/login">
              Log in
            </Link>
            <span className="hidden sm:inline-block h-4 w-[1.5px] bg-snow/50" />
            <a
              href="https://focalyst.online/app"
              className="rounded-full border border-snow/65 bg-snow/10 px-4 py-2 text-[13px] font-medium text-snow backdrop-blur-md transition-all hover:bg-snow/20"
            >
              Download the App
            </a>
          </div>
        </header>

        {/* Hero Center Copy & Dual Buttons (Positioned in the upper sky above the person's head) */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1160px] flex-1 flex-col items-center justify-start px-6 pt-[10vh] sm:pt-[12vh] lg:pt-[13vh] text-center">
          <h1 className="font-display text-[clamp(44px,5.6vw,86px)] font-normal leading-[1.05] tracking-[-0.02em] text-snow lg:whitespace-nowrap [text-shadow:0_4px_24px_rgba(0,0,0,0.35)]">
            Own your time. Build what <em className="italic">matters.</em>
          </h1>

          <p className="mt-4 max-w-[650px] font-ui text-[15.5px] sm:text-[18px] leading-[1.55] text-snow/95 font-normal [text-shadow:0_2px_14px_rgba(0,0,0,0.45)]">
            Turn your ambitions into action with AI-powered planning, focused
            work sessions, and habits that move you forward.
          </p>

          {/* Dual CTA Buttons */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link className="inline-flex h-[48px] w-full sm:w-auto min-w-[210px] items-center justify-center rounded-full border border-snow/85 bg-snow/20 px-7 text-[15px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-snow hover:text-[#05070F]" href="/login">
              Continue on Desktop
            </Link>

            <a
              href="https://focalyst.online/app"
              className="inline-flex h-[48px] w-full sm:w-auto min-w-[210px] items-center justify-center rounded-full border border-snow/75 bg-[#05070F]/35 px-7 text-[15px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#05070F]/60"
            >
              Download the App
            </a>
          </div>
        </div>

        {/* Bottom Spacer so the person in the flower meadow stays unobstructed */}
        <div className="relative z-10 h-16" />
      </section>

      {/* ================= FOCALYST MCP WAITLIST & FOOTER (Always Dark Mode Gradient) ================= */}
      <section
        id="mcp"
        className="relative isolate overflow-hidden px-6 pt-20 pb-14"
        style={{
          background:
            'radial-gradient(65% 75% at 50% 35%, rgba(25, 81, 252, 0.24) 0%, rgba(11, 44, 177, 0.16) 45%, rgba(5, 7, 15, 1) 100%)',
        }}
      >
        {/* Waitlist Card */}
        <div className="mx-auto max-w-[880px] rounded-[28px] border border-white/10 bg-[#0B1020]/75 p-10 sm:p-14 text-center backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
          <div className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
            FOCALYST MCP
          </div>

          <h2 className="mt-5 font-display text-[clamp(36px,4.2vw,54px)] leading-[1.08] tracking-[-0.015em] text-snow">
            Your Focalyst, inside your AI.
          </h2>

          <p className="mx-auto mt-3.5 max-w-[540px] text-[15.5px] leading-[1.6] text-[#A3ADC8]">
            Connect your habits, tasks and focus sessions to the AI assistants
            you already use.
          </p>

          <div className="mx-auto mt-8 max-w-[500px]">
            <KitWaitlist />
          </div>
        </div>

        {/* Footer */}
        <footer className="mx-auto mt-20 max-w-[1280px] border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-[#6B7591]">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="font-semibold text-snow">Focalyst</span>
            <a
              href="https://focalyst.online/app"
              className="hover:text-snow transition-colors"
            >
              Features
            </a>
            <a href="#mcp" className="hover:text-snow transition-colors">
              MCP
            </a>
            <a
              href="https://focalyst.online/app"
              className="hover:text-snow transition-colors"
            >
              About
            </a>
            <Link className="hover:text-snow transition-colors" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-snow transition-colors" href="/terms">
              Terms of Service
            </Link>
            <Link className="hover:text-snow transition-colors" href="/help">
              Help &amp; FAQ
            </Link>
            <a
              href="mailto:support@focalyst.online"
              className="hover:text-snow transition-colors"
            >
              Contact Us
            </a>
            <a
              href="https://focalyst.online/app"
              className="hover:text-snow transition-colors"
            >
              Download the App
            </a>
          </div>

          <p>© 2026 Focalyst. All rights reserved.</p>
        </footer>
      </section>
    </div>
  );
}
