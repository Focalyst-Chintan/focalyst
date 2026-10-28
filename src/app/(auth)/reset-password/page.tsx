'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import AmbientBackground from '@/components/desktop/AmbientBackground';

function isWeakPasswordError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const code = (e.code || '').toLowerCase();
  const msg = (e.message || '').toLowerCase();
  return (
    code === 'weak_password' ||
    msg.includes('weak') ||
    msg.includes('password should be') ||
    msg.includes('at least 6') ||
    msg.includes('at least 8') ||
    msg.includes('characters')
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const errorParam = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isCheckingSession, setIsCheckingSession] = useState(!errorParam);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // If the URL has error=expired or any auth error from redirect, skip check
    if (errorParam) {
      return;
    }

    let isMounted = true;

    // Check if recovery session is active
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session) {
          setHasValidSession(true);
          setIsCheckingSession(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        setHasValidSession(!!user);
      } catch (err) {
        console.error('[auth] check recovery session error', err);
        if (isMounted) setHasValidSession(false);
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && !errorParam)) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!password || !confirmPassword) {
      setErrorMessage('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Use at least 8 characters with a mix of letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (isWeakPasswordError(error)) {
          setErrorMessage('Use at least 8 characters with a mix of letters and numbers.');
        } else {
          setErrorMessage(error.message || 'Failed to update password.');
        }
        setIsLoading(false);
        return;
      }

      // Invalidate other active sessions
      try {
        await supabase.auth.signOut({ scope: 'others' });
      } catch (signOutErr) {
        console.warn('[auth] signOut others warning', signOutErr);
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      console.error('[auth] updateUser catch', err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render form content inside container
  const renderContent = (isDesktop: boolean) => {
    if (isCheckingSession) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
          <p className="text-[13px] text-ink-2">Verifying reset link...</p>
        </div>
      );
    }

    // Link expired or invalid recovery session
    if (!hasValidSession || errorParam === 'expired') {
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[20px] font-semibold text-ink">Link expired</h2>
            <p className="text-[14px] text-ink-2 max-w-[300px]">
              This link has expired or was already used.
            </p>
          </div>
          <div className="pt-2 w-full">
            <Link
              href="/forgot-password"
              className={
                isDesktop
                  ? 'h-12 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] shadow-[var(--shadow-1)]'
                  : 'w-full h-12 bg-primary text-snow text-[15px] font-semibold rounded-xl flex items-center justify-center transition-all active:scale-[0.98] hover:bg-primary-hover cursor-pointer shadow-[var(--shadow-1)]'
              }
            >
              Request a new link
            </Link>
          </div>
          <div className="pt-2 text-center text-[13px] text-ink-2">
            <Link
              href="/login"
              className="text-primary-text font-medium hover:underline cursor-pointer"
            >
              Back to log in
            </Link>
          </div>
        </div>
      );
    }

    // Success screen
    if (isSuccess) {
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[22px] font-semibold text-ink">Password updated.</h2>
            <p className="text-[14px] text-ink-2">
              Your password has been changed successfully.
            </p>
          </div>
          <div className="pt-2 w-full">
            <Link
              href="/app"
              className={
                isDesktop
                  ? 'h-12 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] shadow-[var(--shadow-1)]'
                  : 'w-full h-12 bg-primary text-snow text-[15px] font-semibold rounded-xl flex items-center justify-center transition-all active:scale-[0.98] hover:bg-primary-hover cursor-pointer shadow-[var(--shadow-1)]'
              }
            >
              Continue to Focalyst
            </Link>
          </div>
          <p className="text-[13px] text-ink-3 pt-2 max-w-[320px]">
            Using the app? Open Focalyst and log in with your new password.
          </p>
        </div>
      );
    }

    // Password reset form
    return (
      <div className="w-full">
        {isDesktop ? (
          <>
            <h1 className="font-ui text-[26px]/[32px] font-semibold text-ink">
              Create new password
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-2">
              Enter and confirm your new password below.
            </p>
          </>
        ) : (
          <div className="text-center mb-5">
            <h2 className="text-[20px] font-semibold text-ink">
              Create new password
            </h2>
            <p className="text-[13px] text-ink-2 mt-1">
              Enter and confirm your new password below.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={isDesktop ? 'mt-6 space-y-4' : 'flex flex-col gap-3'}>
          {/* New password field */}
          <div className="space-y-1.5">
            {isDesktop && (
              <label htmlFor="new-password-input" className="text-[13px] font-medium text-ink-2">
                New password
              </label>
            )}
            <div className="relative flex items-center">
              <input
                id="new-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder={isDesktop ? '••••••••' : 'New password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className={
                  isDesktop
                    ? 'h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 pl-3.5 pr-10 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]'
                    : 'w-full h-12 bg-surface-2 rounded-xl pl-4 pr-11 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all'
                }
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-ink-3 hover:text-ink cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div className="space-y-1.5">
            {isDesktop && (
              <label htmlFor="confirm-password-input" className="text-[13px] font-medium text-ink-2">
                Confirm new password
              </label>
            )}
            <div className="relative flex items-center">
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder={isDesktop ? '••••••••' : 'Confirm new password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className={
                  isDesktop
                    ? 'h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 pl-3.5 pr-10 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]'
                    : 'w-full h-12 bg-surface-2 rounded-xl pl-4 pr-11 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all'
                }
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-ink-3 hover:text-ink cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-[12px] text-ink-3">
            Must be at least 8 characters with letters and numbers.
          </p>

          {errorMessage && (
            <p role="alert" className="text-[13px] text-danger text-center">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={
              isDesktop
                ? 'h-12 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] mt-2 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] shadow-[var(--shadow-1)]'
                : 'w-full h-12 bg-primary text-snow text-[15px] font-semibold rounded-xl mt-1 transition-all active:scale-[0.98] hover:bg-primary-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-[var(--shadow-1)]'
            }
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isLoading ? 'Updating password' : 'Reset password'}</span>
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-ink-2">
          <Link
            href="/login"
            className="text-primary-text font-medium hover:underline cursor-pointer"
          >
            Back to log in
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* =====================================================================
          MOBILE LAYOUT (< 1024px, lg:hidden)
          ===================================================================== */}
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12 lg:hidden">
        <div className="w-full max-w-[340px] flex flex-col items-center gap-6">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-ink text-[24px] font-bold tracking-[0.15em]">
                FOCALYST
              </h1>
            </Link>
            <p className="text-ink-2 text-sm mt-1">Own your time.</p>
          </div>

          <div className="w-full">{renderContent(false)}</div>
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
            <div className="max-w-[380px] w-full mx-auto">{renderContent(true)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-canvas flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
