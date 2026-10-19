'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';

export default function LandingPage() {
  const router = useRouter();
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

          {/* Desktop Right Auth / App Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link className="text-[13.5px] font-medium text-snow/90 transition-colors hover:text-snow drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]" href="/login">
              Log in
            </Link>
            <span className="h-4 w-[1.5px] bg-snow/50" />
            <a
              href="https://focalyst.online/app"
              className="rounded-full border border-snow/65 bg-snow/10 px-4 py-2 text-[13px] font-medium text-snow backdrop-blur-md transition-all hover:bg-snow/20"
            >
              Download the App
            </a>
          </div>

          {/* Mobile Hamburger Menu Button (Matches mockup) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="flex lg:hidden h-11 w-11 items-center justify-center rounded-full bg-snow/20 border border-snow/40 text-snow backdrop-blur-md transition-all hover:bg-snow/30"
          >
            <Menu className="h-6 w-6" strokeWidth={2.2} />
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#05070F]/95 backdrop-blur-2xl px-6 py-6 lg:hidden">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <span className="text-[20px] font-semibold text-snow">Focalyst</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Navigation Menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-snow"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-5 pt-8 text-[16px] font-medium text-snow/90">
              <a
                href="https://focalyst.online/app"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Features
              </a>
              <a
                href="#mcp"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                MCP
              </a>
              <a
                href="https://focalyst.online/app"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                About
              </a>
              <Link
                href="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Help &amp; FAQ
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:support@focalyst.online"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Contact Us
              </a>
              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-12 items-center justify-center rounded-full bg-primary text-snow font-semibold"
                >
                  Log in
                </Link>
                <a
                  href="https://focalyst.online/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-snow font-semibold"
                >
                  Download the App
                </a>
              </div>
            </nav>
          </div>
        )}

        {/* ================= HERO TEXT & BUTTONS ================= */}
        {/*
          1. On DESKTOP: Centered in the top sky area, shifted UP so buttons clear the head.
          2. On MOBILE: Headline in the upper sky, buttons stacked at the bottom (matching mockup).
        */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-between lg:justify-start px-6 pt-[8vh] lg:pt-8 text-center pb-[7vh] lg:pb-0">
          {/* Main Headline & Subtitle (Always in the Upper Sky) */}
          <div className="flex flex-col items-center">
            <h1 className="font-display text-[42px] leading-[1.08] sm:text-[56px] lg:text-[76px] font-normal lg:leading-[1.05] tracking-[-0.02em] text-snow [text-shadow:0_4px_24px_rgba(0,0,0,0.4)]">
              Own your time. Build what <em className="italic">matters.</em>
            </h1>

            <p className="mt-3.5 max-w-[560px] lg:max-w-[620px] font-ui text-[14.5px] sm:text-[16px] lg:text-[17px] leading-[1.55] text-snow/90 font-normal [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Turn your ambitions into action with AI-powered planning, focused
              work sessions, and habits that move you forward.
            </p>

            {/* Desktop-Only Buttons (Positioned directly under text in the sky, safely above the head) */}
            <div className="hidden lg:flex items-center justify-center gap-4 mt-6">
              <Link
                className="inline-flex h-[44px] min-w-[195px] items-center justify-center rounded-full border border-snow/80 bg-snow/20 px-6 text-[14px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-snow hover:text-[#05070F]"
                href="/login"
              >
                Continue on Desktop
              </Link>
              <a
                href="https://focalyst.online/app"
                className="inline-flex h-[44px] min-w-[195px] items-center justify-center rounded-full border border-snow/65 bg-[#05070F]/40 px-6 text-[14px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#05070F]/65"
              >
                Download the App
              </a>
            </div>
          </div>

          {/* Mobile-Only Buttons (Stacked in the lower third of the screen, matching mobile view mockup) */}
          <div className="flex lg:hidden flex-col items-center gap-3.5 w-full max-w-[340px] mx-auto">
            <Link
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-snow/90 bg-snow/20 text-[16px] font-semibold text-snow backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all hover:bg-snow hover:text-[#05070F]"
              href="/login"
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
        <div className="mx-auto max-w-[880px] rounded-[28px] border border-white/10 bg-[#0B1020]/75 p-8 sm:p-14 text-center backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
          <div className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
            FOCALYST MCP
          </div>

          <h2 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[54px] leading-[1.08] tracking-[-0.015em] text-snow">
            Your Focalyst, inside your AI.
          </h2>

          <p className="mx-auto mt-3 max-w-[540px] text-[14.5px] sm:text-[16px] leading-[1.6] text-[#A3ADC8]">
            Connect your habits, tasks and focus sessions to the AI assistants
            you already use.
          </p>

          <div className="mx-auto mt-7 max-w-[500px]">
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
