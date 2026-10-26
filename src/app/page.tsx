'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

const KitWaitlist = dynamic(() => import('@/components/desktop/mcp/KitWaitlist'), {
  ssr: false,
  loading: () => <Skeleton className="h-12 w-full max-w-[500px] rounded-xl" />,
});

export default function LandingPage() {
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
            <div className="flex items-center justify-between pb-6 border-b border-snow/10">
              <span className="text-[20px] font-semibold text-snow">Focalyst</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Navigation Menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-snow/10 text-snow"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-5 pt-8 text-[16px] font-medium text-snow/90">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                Blog
              </Link>
              <Link
                href="/mcp-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                MCP
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-snow"
              >
                About
              </Link>
              <div className="pt-6 border-t border-snow/10 flex flex-col gap-3">
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
                  className="flex h-12 items-center justify-center rounded-full border border-snow/20 bg-snow/10 text-snow font-semibold"
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
                href="/today"
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
              href="/today"
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
            Connect your habits, tasks and focus sessions to the AI assistants
            you already use.
          </p>

          <div className="mx-auto mt-7 max-w-[500px]">
            <KitWaitlist />
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
