'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import AmbientBackground from '@/components/desktop/AmbientBackground';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendResetLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Please enter your email.');
      return;
    }

    setValidationError('');
    setIsLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined' && window.location.origin.includes('localhost')
          ? `${window.location.origin}/reset-password`
          : 'https://focalyst.online/reset-password';

      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });
    } catch (err) {
      console.error('[auth] resetPasswordForEmail error', err);
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
      setCountdown(60);
    }
  };

  return (
    <>
      {/* =====================================================================
          MOBILE LAYOUT (< 1024px, lg:hidden)
          ===================================================================== */}
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12 lg:hidden">
        <div className="w-full max-w-[340px] flex flex-col items-center gap-6">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-ink text-[24px] font-bold tracking-[0.15em]">
                FOCALYST
              </h1>
            </Link>
            <p className="text-ink-2 text-sm mt-1">Own your time.</p>
          </div>

          <div className="w-full flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold text-ink">
                Reset your password
              </h2>
              <p className="text-[13px] text-ink-2 mt-1">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {isSubmitted ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="rounded-[14px] bg-surface-2 border border-line p-4 text-[13px] text-ink-2 leading-relaxed"
                >
                  If an account exists for that email, we&apos;ve sent a reset link. Check your inbox and spam folder.
                </div>

                <div className="flex items-center justify-between text-[13px] text-ink-2 px-1">
                  <span>Didn&apos;t receive it?</span>
                  <button
                    type="button"
                    disabled={countdown > 0 || isLoading}
                    onClick={() => handleSendResetLink()}
                    className="text-primary-text font-medium hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : 'Resend'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendResetLink} className="flex flex-col gap-3">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full h-12 bg-surface-2 rounded-xl px-4 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all"
                />

                {validationError && (
                  <p role="alert" className="text-[12px] text-danger text-center">
                    {validationError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-snow text-[15px] font-semibold rounded-xl mt-1 transition-all active:scale-[0.98] hover:bg-primary-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-[var(--shadow-1)]"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isLoading ? 'Sending reset link' : 'Send reset link'}</span>
                </button>
              </form>
            )}

            <div className="text-center text-[13px] text-ink-2 pt-2">
              <Link
                href="/login"
                className="text-primary-text font-medium hover:underline cursor-pointer"
              >
                Back to log in
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          DESKTOP LAYOUT (>= 1024px, hidden lg:flex)
          Split-screen glass-strong liquid container with brand gradient left panel
          ===================================================================== */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-8 bg-canvas relative overflow-hidden font-ui">
        <AmbientBackground />

        <div className="relative z-10 w-full max-w-[1120px] min-h-[min(720px,calc(100vh-64px))] rounded-[28px] glass-strong liquid overflow-hidden grid grid-cols-[1.1fr_1fr] shadow-[var(--shadow-glass)]">
          {/* LEFT PANEL */}
          <div
            className="relative flex flex-col justify-between p-12 overflow-hidden text-snow"
            style={{
              backgroundColor: '#03195B',
              backgroundImage:
                'radial-gradient(circle at 0% 100%, #1951FC 0%, transparent 55%), radial-gradient(circle at 100% 0%, #0B2CB1 0%, transparent 45%)',
            }}
          >
            <div className="ambient-grain" />

            <div className="relative z-10">
              <Link
                href="/"
                className="font-ui font-semibold text-[13px] tracking-[0.32em] text-snow hover:opacity-90 transition-opacity"
              >
                FOCALYST
              </Link>
            </div>

            <div className="relative z-10 mt-auto">
              <h2 className="font-display text-[48px]/[52px] text-snow">
                Own your time.
              </h2>
              <p className="mt-3 text-[15px] text-snow/70">
                Plan, focus and reflect in one calm place.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="p-12 sm:p-14 flex flex-col justify-center bg-surface/40">
            <div className="max-w-[380px] w-full mx-auto">
              <h1 className="font-ui text-[26px]/[32px] font-semibold text-ink">
                Forgot password?
              </h1>
              <p className="mt-1.5 text-[14px] text-ink-2">
                Enter your email to receive a password reset link.
              </p>

              {isSubmitted ? (
                <div className="mt-6 space-y-4">
                  <div
                    role="status"
                    className="rounded-[14px] bg-surface-2 border border-line p-4 text-[13px] text-ink-2 leading-relaxed"
                  >
                    If an account exists for that email, we&apos;ve sent a reset link. Check your inbox and spam folder.
                  </div>

                  <div className="flex items-center justify-between text-[13px] text-ink-2 px-1">
                    <span>Didn&apos;t receive it?</span>
                    <button
                      type="button"
                      disabled={countdown > 0 || isLoading}
                      onClick={() => handleSendResetLink()}
                      className="text-primary-text font-medium hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                    >
                      {countdown > 0 ? `Resend (${countdown}s)` : 'Resend'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-email-input" className="text-[13px] font-medium text-ink-2">
                      Email address
                    </label>
                    <input
                      id="forgot-email-input"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      className="h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 px-3.5 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                    />
                  </div>

                  {validationError && (
                    <p role="alert" className="text-[13px] text-danger text-center">
                      {validationError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] mt-2 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] shadow-[var(--shadow-1)]"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isLoading ? 'Sending reset link' : 'Send reset link'}</span>
                  </button>
                </form>
              )}

              <div className="mt-6 text-center text-[13px] text-ink-2">
                <Link
                  href="/login"
                  className="text-primary-text font-medium hover:underline cursor-pointer"
                >
                  Back to log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-canvas flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
