'use client';
// 27b "Check your email." on the login page in save-plan mode (WEB_ONBOARDING_DESIGN.md 4, 27b).
// Resend uses the same call as the login page's CheckInboxPanel.
import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/desktop/ui';

export default function SavePlanCheckEmail({ email, onUseDifferentEmail }: { email: string; onUseDifferentEmail: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const { error: err } = await createClient().auth.resend({ type: 'signup', email });
      if (err) {
        console.error('[auth] resend', err.code, err.message);
        setError('Something went wrong. Please try again.');
      } else {
        setSent(true);
        setCooldown(60);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-text">
        <Mail className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="font-display text-[28px] leading-[34px] text-ink">Check your email.</h2>
      <p className="mt-2 max-w-[340px] text-[14px] leading-[22px] text-ink-2">
        We sent a link to <span className="font-medium text-ink">{email}</span>. Open it in this browser to save your plan.
      </p>
      {sent && <p role="status" className="mt-3 text-[13px] font-medium text-primary-text">Email sent again.</p>}
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button variant="secondary" size="lg" onClick={resend} disabled={sending || cooldown > 0} className="w-full">
          {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
        </Button>
        <Button variant="ghost" size="lg" onClick={onUseDifferentEmail} className="w-full">
          Use a different email
        </Button>
      </div>
    </div>
  );
}
