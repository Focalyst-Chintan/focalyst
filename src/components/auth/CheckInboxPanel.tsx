'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Mail, Loader2 } from 'lucide-react';

interface CheckInboxPanelProps {
  email: string;
  onUseDifferentEmail: () => void;
}

export default function CheckInboxPanel({ email, onUseDifferentEmail }: CheckInboxPanelProps) {
  const supabase = createClient();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        console.error('[auth] resend', error.code, error.message);
        setResendError('Something went wrong. Please try again.');
      } else {
        setResendSuccess(true);
        setCooldown(60);
      }
    } catch (err: any) {
      console.error('[auth] resend catch', err);
      setResendError('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full text-center flex flex-col items-center">
      <div className="h-12 w-12 rounded-full bg-primary-soft flex items-center justify-center mb-4 text-primary-text">
        <Mail className="h-6 w-6" />
      </div>

      <h2 className="font-ui text-[24px] font-semibold text-ink">
        Check your inbox
      </h2>

      <p className="mt-2 text-[14px] text-ink-2 leading-relaxed max-w-[340px]">
        We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open it to finish creating your account. If it is not there in a minute, check your spam folder.
      </p>

      {resendSuccess && (
        <p role="status" className="mt-3 text-[13px] text-emerald-500 font-medium">
          Email sent again.
        </p>
      )}

      {resendError && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {resendError}
        </p>
      )}

      <div className="mt-6 w-full flex flex-col gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className="h-11 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isResending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isResending
              ? 'Resending'
              : 'Resend email'}
          </span>
        </button>

        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="text-[13px] text-ink-2 hover:text-ink hover:underline cursor-pointer py-1"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
