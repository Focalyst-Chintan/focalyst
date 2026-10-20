'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { createClient } from '@/lib/supabase';
import { GlobalToastContainer } from '@/components/desktop/ui/Toast';

const NAV_LINKS = [
  { href: '/app', label: 'Features' },
  { href: '/blog', label: 'Blog' },
  { href: '/mcp-preview', label: 'MCP' },
  { href: '/about', label: 'About' },
];

export default function PublicLayout({
  children,
  strongAmbient = false,
}: {
  children: React.ReactNode;
  strongAmbient?: boolean;
}) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }: any) => {
        setSignedIn(Boolean(data?.session));
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-ui text-ink selection:bg-primary selection:text-snow print:bg-snow print:text-black">
      <div className="print:hidden">
        <AmbientBackground strong={strongAmbient} />
      </div>

      {/* Sticky Glass Nav */}
      <header className="sticky top-3 z-40 mx-auto w-full max-w-[1200px] px-4 print:hidden">
        <nav
          aria-label="Primary"
          className="glass-strong liquid flex h-16 items-center justify-between rounded-[20px] px-5"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.32em] text-ink focus-visible:outline-none"
          >
            <Image src="/small-logo.png" alt="Focalyst" width={24} height={24} className="h-6 w-6 rounded-[6px]" />
            <span>FOCALYST</span>
          </Link>

          {/* Desktop Center Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[14px] font-medium transition-colors ${
                    active ? 'text-primary-text' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right CTA */}
          <div className="hidden md:flex items-center gap-2.5">
            {signedIn ? (
              <Link
                href="/today"
                className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-4 text-[14px] font-medium text-snow transition-colors hover:bg-primary-hover"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-[14px] font-medium text-ink hover:bg-surface-2 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-4 text-[14px] font-medium text-snow transition-colors hover:bg-primary-hover"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-[10px] text-ink hover:bg-surface-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile Glass Sheet */}
        {mobileOpen ? (
          <div className="glass-strong liquid mt-2 flex flex-col gap-2 rounded-[20px] p-4 md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              {signedIn ? (
                <Link
                  href="/today"
                  className="flex h-11 items-center justify-center rounded-[14px] bg-primary text-[14px] font-medium text-snow"
                >
                  Open app
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex h-11 items-center justify-center rounded-[14px] bg-surface-2 text-[14px] font-medium text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    className="flex h-11 items-center justify-center rounded-[14px] bg-primary text-[14px] font-medium text-snow"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      {/* Shared 4-Column Footer */}
      <footer className="mt-24 border-t border-line bg-surface/40 py-16 print:hidden">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.32em] text-ink">
                <Image src="/small-logo.png" alt="Focalyst" width={22} height={22} className="h-[22px] w-[22px] rounded-[5px]" />
                <span>FOCALYST</span>
              </div>
              <p className="mt-3 font-display text-[22px] text-ink">Own your time.</p>
              <p className="mt-1 text-[13px] text-ink-3">Focalyst by Chintan · Kolkata, India</p>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Product</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-2">
                <li><Link href="/app" className="hover:text-ink">Features</Link></li>
                <li><Link href="/mcp-preview" className="hover:text-ink">MCP</Link></li>
                <li><Link href="/blog" className="hover:text-ink">Blog</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Company</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-2">
                <li><Link href="/about" className="hover:text-ink">About</Link></li>
                <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Support</div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-2">
                <li><Link href="/help" className="hover:text-ink">Help and FAQ</Link></li>
                <li><Link href="/privacy" className="hover:text-ink">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-ink">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-line pt-6 text-[13px] text-ink-3">
            © 2026 Focalyst by Chintan. All rights reserved.
          </div>
        </div>
      </footer>

      <GlobalToastContainer />
    </div>
  );
}
