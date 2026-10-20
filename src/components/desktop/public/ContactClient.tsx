'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Mail, Headphones, CreditCard, ShieldCheck, Handshake } from 'lucide-react';
import { useToast } from '@/components/desktop/ui/Toast';

export default function ContactClient() {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('contactfocalyst@gmail.com');
      setCopied(true);
      toast.show('Email copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="fx-reveal mx-auto max-w-[720px] pt-14 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Contact
        </div>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.08] text-ink">
          We would love to hear from you.
        </h1>
        <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[28px] text-ink-2">
          Questions, feedback, a bug you spotted or an idea that would make Focalyst better. Every message is read by a real person.
        </p>
      </section>

      {/* Primary Email Card */}
      <section
        className="fx-reveal glass liquid mx-auto mt-10 max-w-[720px] rounded-[28px] p-8 text-center"
        style={{ ['--fx-delay' as string]: '80ms' }}
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Email us
        </div>
        <div className="mt-1 font-display text-[28px] text-ink sm:text-[36px]">
          contactfocalyst@gmail.com
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-[14px] font-medium text-snow transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>Copy email</span>
          </button>
          <a
            href="mailto:contactfocalyst@gmail.com"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-line bg-surface-2 px-5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none"
          >
            <Mail className="h-4 w-4" />
            <span>Write an email</span>
          </a>
        </div>

        <p className="mt-4 text-[13px] text-ink-3">
          We read every message and reply as soon as we can.
        </p>
      </section>

      {/* Topic Cards */}
      <section
        className="fx-reveal mx-auto mt-12 grid max-w-[920px] grid-cols-1 gap-5 md:grid-cols-2"
        style={{ ['--fx-delay' as string]: '160ms' }}
      >
        <div className="frost rounded-[20px] p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
            <Headphones className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[17px] font-semibold text-ink">Support</h3>
          <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
            Something not working the way it should? Tell us what happened, which device and browser you used and, if you can, attach a screenshot.
          </p>
        </div>

        <div className="frost rounded-[20px] p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[17px] font-semibold text-ink">Billing</h3>
          <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
            Payments are processed securely by Polar. For receipts, plan changes or refunds, email us from the address you used to pay.
          </p>
        </div>

        <div className="frost rounded-[20px] p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[17px] font-semibold text-ink">Privacy and data</h3>
          <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
            To access, export, correct or delete your data, email us with the subject &ldquo;Privacy request&rdquo;. You can find the details in our{' '}
            <Link href="/privacy" className="text-primary-text underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <div className="frost rounded-[20px] p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
            <Handshake className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[17px] font-semibold text-ink">Partnerships and press</h3>
          <p className="mt-2 text-[14px] leading-[22px] text-ink-2">
            Creators, educators and teams who want to work with Focalyst, we would be glad to talk.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <div className="mt-12 flex flex-wrap justify-center gap-6 text-center text-[14px] text-primary-text">
        <Link href="/help" className="hover:underline">
          Help and FAQ
        </Link>
        <span className="text-ink-3">·</span>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span className="text-ink-3">·</span>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
      </div>

      {/* Business Details */}
      <div className="mt-4 text-center text-[13px] text-ink-3">
        Focalyst by Chintan · Registered MSME · Kolkata, West Bengal, India
      </div>
    </div>
  );
}
