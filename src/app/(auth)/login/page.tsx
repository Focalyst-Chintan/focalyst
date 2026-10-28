'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AppleIcon from '@/components/icons/AppleIcon';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { saveCheckoutIntent, peekCheckoutIntent, IntentPlan } from '@/lib/billing/checkoutIntent';
import CheckInboxPanel from '@/components/auth/CheckInboxPanel';
import { safeNext, isOAuthReturn } from '@/lib/auth/safeNext';

function isEmailNotConfirmedError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'email_not_confirmed' ||
    msg.includes('email not confirmed') ||
    msg.includes('not confirmed')
  );
}

function isUserAlreadyExistsError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists')
  );
}

function isInvalidCredentialsError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials')
  );
}

function isWeakPasswordError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'weak_password' ||
    msg.includes('weak') ||
    msg.includes('password should be') ||
    msg.includes('at least 6') ||
    msg.includes('at least 8') ||
    msg.includes('characters')
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = safeNext(searchParams.get('next'));

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasPlanIntent, setHasPlanIntent] = useState(false);

  // Flow specific panels and alerts
  const [showCheckInbox, setShowCheckInbox] = useState(false);
  const [existingAccountMismatch, setExistingAccountMismatch] = useState(false);
  const [loginInvalidCreds, setLoginInvalidCreds] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get('plan') as IntentPlan | null;
    if (planParam && ['monthly', 'yearly', 'lifetime'].includes(planParam)) {
      saveCheckoutIntent(planParam);
      setHasPlanIntent(true);
    } else if (peekCheckoutIntent()) {
      setHasPlanIntent(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const qMode = searchParams.get('mode');
    if (qMode === 'signup' || qMode === 'login' || qMode === 'reset') {
      setMode(qMode);
    }
  }, [searchParams]);

  // If already authenticated on /login, redirect: next if given, else desktop -> /today, mobile -> /plan
  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      const authUser = res?.data?.user;
      if (authUser) {
        if (nextPath) {
          router.replace(nextPath);
          return;
        }
        const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
        router.replace(isDesktop ? '/today' : '/plan');
      }
    });
  }, [router, supabase, nextPath]);

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    setMessage('');
    setIsSuccess(false);
    setShowCheckInbox(false);
    setExistingAccountMismatch(false);
    setLoginInvalidCreds(false);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  const handleAuthSuccess = async () => {
    router.refresh();
    if (isOAuthReturn(nextPath)) {
      router.push(nextPath!);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_done')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_done) {
        if (nextPath) {
          router.push(nextPath);
        } else if (window.innerWidth >= 1024) {
          router.push('/today');
        } else {
          router.push('/plan');
        }
      } else {
        router.push('/onboarding/plans');
      }
    } else {
      if (nextPath) {
        router.push(nextPath);
      } else {
        router.push(window.innerWidth >= 1024 ? '/today' : '/plan');
      }
    }
  };

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath ?? '/onboarding/plans')}`;

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl(),
        },
      });
      if (error) {
        console.error('[auth] google', error.code, error.message);
        setMessage('Something went wrong. Please try again.');
        setIsSuccess(false);
      }
    } catch {
      console.error('[auth] google initiation failed');
      setMessage('Something went wrong. Please try again.');
      setIsSuccess(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: callbackUrl(),
        },
      });
      if (error) {
        console.error('[auth] apple', error.code, error.message);
        setMessage('Something went wrong. Please try again.');
        setIsSuccess(false);
      }
    } catch {
      console.error('[auth] apple initiation failed');
      setMessage('Something went wrong. Please try again.');
      setIsSuccess(false);
    }
  };

  const handleTriggerResetPassword = async (targetEmail: string) => {
    if (!targetEmail) {
      setMessage('Please enter your email to reset your password.');
      setIsSuccess(false);
      return;
    }
    setIsLoading(true);
    setMessage('');
    setExistingAccountMismatch(false);
    setLoginInvalidCreds(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      if (error) {
        console.error('[auth] resetPassword', error.code, error.message);
        setMessage('Something went wrong. Please try again.');
        setIsSuccess(false);
      } else {
        setMessage(`Password reset link sent to ${targetEmail}. Check your inbox.`);
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error('[auth] resetPassword catch', err);
      setMessage('Something went wrong. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');
    setExistingAccountMismatch(false);
    setLoginInvalidCreds(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (data?.session) {
        await handleAuthSuccess();
        return;
      }

      if (error) {
        if (isEmailNotConfirmedError(error)) {
          setShowCheckInbox(true);
          return;
        }

        if (isInvalidCredentialsError(error)) {
          setLoginInvalidCreds(true);
          return;
        }

        console.error('[auth] login', error.code, error.message);
        setMessage('Something went wrong. Please try again.');
        setIsSuccess(false);
      }
    } catch (err: any) {
      console.error('[auth] login catch', err);
      setMessage('Something went wrong. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setIsSuccess(false);
      return;
    }

    if (password.length < 8) {
      setMessage('Use at least 8 characters with a mix of letters and numbers.');
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');
    setExistingAccountMismatch(false);
    setLoginInvalidCreds(false);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: fullName ? { full_name: fullName, name: fullName } : undefined,
          emailRedirectTo: callbackUrl(),
        },
      });

      // 2.a: If data.session exists: continue exactly as a successful sign-up does today
      if (signUpData?.session) {
        await handleAuthSuccess();
        return;
      }

      // 2.b: If there is no session and no error: immediately call signInWithPassword
      if (!signUpError && !signUpData?.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInData?.session) {
          await handleAuthSuccess();
          return;
        }

        if (signInError) {
          if (isEmailNotConfirmedError(signInError)) {
            setShowCheckInbox(true);
            return;
          }
          console.error('[auth] signup signin fallback', signInError.code, signInError.message);
          setMessage('Something went wrong. Please try again.');
          setIsSuccess(false);
          return;
        }

        setShowCheckInbox(true);
        return;
      }

      // 2.c: If error means the user already exists
      if (signUpError) {
        if (isUserAlreadyExistsError(signUpError)) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInData?.session) {
            await handleAuthSuccess();
            return;
          }

          if (signInError) {
            if (isEmailNotConfirmedError(signInError)) {
              setShowCheckInbox(true);
              return;
            }
            if (isInvalidCredentialsError(signInError)) {
              setExistingAccountMismatch(true);
              return;
            }
            console.error('[auth] signup existing user signin', signInError.code, signInError.message);
            setMessage('Something went wrong. Please try again.');
            setIsSuccess(false);
            return;
          }

          setShowCheckInbox(true);
          return;
        }

        // 4. Password rule message, if Supabase rejects a weak password
        if (isWeakPasswordError(signUpError)) {
          setMessage('Use at least 8 characters with a mix of letters and numbers.');
          setIsSuccess(false);
          return;
        }

        // 3. Never show raw Supabase error text
        console.error('[auth] signup', signUpError.code, signUpError.message);
        setMessage('Something went wrong. Please try again.');
        setIsSuccess(false);
      }
    } catch (err: any) {
      console.error('[auth] signup catch', err);
      setMessage('Something went wrong. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      handleSignUp(e);
    } else if (mode === 'reset') {
      handleTriggerResetPassword(email);
    } else {
      handleLogin(e);
    }
  };

  const submitButtonLabel = isLoading
    ? mode === 'signup'
      ? 'Creating your account'
      : mode === 'reset'
      ? 'Sending reset link'
      : 'Logging in'
    : mode === 'signup'
    ? 'Create account'
    : mode === 'reset'
    ? 'Send reset link'
    : 'Log in';

  return (
    <>
      {/* =====================================================================
          MOBILE LAYOUT (< 1024px, lg:hidden)
          ===================================================================== */}
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12 lg:hidden">
        <div className="w-full max-w-[340px] flex flex-col items-center gap-6">
          {/* Heading */}
          <div className="text-center">
            <h1 className="text-ink text-[24px] font-bold tracking-[0.15em]">
              FOCALYST
            </h1>
            <p className="text-ink-2 text-sm mt-1">Own your time.</p>
          </div>

          {/* Checkout Intent Banner (Mobile) */}
          {hasPlanIntent && (
            <div className="w-full rounded-xl text-sm px-4 py-3 bg-[var(--primary-soft)] text-[var(--primary-text)] font-medium text-center">
              {mode === 'signup'
                ? 'Create your account to continue to Focalyst Pro. You will go to secure checkout next.'
                : 'Sign in to continue to Focalyst Pro. You will go to secure checkout next.'}
            </div>
          )}

          {showCheckInbox ? (
            <div className="w-full bg-surface border border-line rounded-[20px] p-6 shadow-[var(--shadow-1)]">
              <CheckInboxPanel
                email={email}
                onUseDifferentEmail={() => {
                  setShowCheckInbox(false);
                  setMessage('');
                  setExistingAccountMismatch(false);
                  setLoginInvalidCreds(false);
                }}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col gap-5">
              {/* Social Login Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 rounded-xl border border-line-strong bg-surface text-ink text-[15px] font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-surface-2 cursor-pointer shadow-[var(--shadow-1)]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  className="w-full h-12 bg-[#05070F] text-snow dark:bg-snow dark:text-[#05070F] text-[15px] font-semibold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer shadow-[var(--shadow-1)]"
                >
                  <AppleIcon className="h-5 w-5 -translate-y-px" />
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center w-full gap-4">
                <div className="flex-1 h-px bg-line"></div>
                <span className="text-ink-3 text-xs font-medium uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-line"></div>
              </div>

              {/* Form Area */}
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
                {mode === 'signup' && (
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 bg-surface-2 rounded-xl px-4 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all"
                  />
                )}

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-surface-2 rounded-xl px-4 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all"
                />

                {mode !== 'reset' && (
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 bg-surface-2 rounded-xl pl-4 pr-11 text-sm text-ink placeholder:text-ink-3 outline-none border border-line focus:border-line-strong transition-all"
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
                )}

                {/* Forgot password link under password field */}
                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <Link
                      href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                      className="text-xs text-ink-2 hover:text-ink hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                {/* Inline account exists mismatch (TASK 1.2.c) */}
                {existingAccountMismatch && (
                  <div className="rounded-[14px] bg-surface-2 border border-line p-3.5 space-y-2 text-left">
                    <p className="text-[13px] text-ink-2 leading-snug">
                      An account with this email already exists. Log in or reset your password.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExistingAccountMismatch(false);
                          switchMode('login');
                        }}
                        className="h-8 px-3 rounded-[10px] bg-primary text-snow text-[13px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
                      >
                        Log in
                      </button>
                      <Link
                        href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                        className="h-8 px-3 rounded-[10px] bg-surface border border-line text-ink text-[13px] font-medium hover:bg-surface-3 transition-colors inline-flex items-center justify-center cursor-pointer"
                      >
                        Reset password
                      </Link>
                    </div>
                  </div>
                )}

                {/* Inline login invalid credentials (TASK 2.3) */}
                {loginInvalidCreds && (
                  <div role="alert" className="text-[13px] text-center pt-1 text-danger">
                    <span>That email and password do not match. Try again or </span>
                    <Link
                      href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                      className="underline hover:text-ink font-medium cursor-pointer"
                    >
                      reset your password
                    </Link>
                    .
                  </div>
                )}

                {/* Error / Success message */}
                {message && (
                  <p
                    role={isSuccess ? 'status' : 'alert'}
                    className={`text-[12px] text-center mt-1 ${
                      isSuccess ? 'text-emerald-500' : 'text-danger'
                    }`}
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-snow text-[15px] font-semibold rounded-xl mt-1 transition-all active:scale-[0.98] hover:bg-primary-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-[var(--shadow-1)]"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{submitButtonLabel}</span>
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="text-center text-[13px] text-ink-2">
                {mode === 'signup' ? (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-primary-text font-medium hover:underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </span>
                ) : (
                  <span>
                    New to Focalyst?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="text-primary-text font-medium hover:underline cursor-pointer"
                    >
                      Create account
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-ink-3 text-xs text-center">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>

      {/* =====================================================================
          DESKTOP LAYOUT (>= 1024px, hidden lg:flex)
          Split-screen glass-strong liquid container with brand gradient left panel
          ===================================================================== */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-8 bg-canvas relative overflow-hidden font-ui">
        <AmbientBackground />

        {/* Centered Split-Screen Container */}
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

            {/* Top-Left: Wordmark */}
            <div className="relative z-10">
              <Link
                href="/"
                className="font-ui font-semibold text-[13px] tracking-[0.32em] text-snow hover:opacity-90 transition-opacity"
              >
                FOCALYST
              </Link>
            </div>

            {/* Bottom Block */}
            <div className="relative z-10 mt-auto">
              <h2 className="font-display text-[48px]/[52px] text-snow">
                Own your time.
              </h2>
              <p className="mt-3 text-[15px] text-snow/70">
                Plan, focus and reflect in one calm place.
              </p>

              {/* 3 Step Cards */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {/* Step 1 */}
                <div
                  className={`rounded-[20px] p-4 h-[140px] flex flex-col justify-between transition-all duration-300 ${
                    mode === 'signup'
                      ? 'bg-snow text-[#0A1022] shadow-lg'
                      : 'bg-snow/10 text-snow border border-snow/15 backdrop-blur-md'
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full text-[12px] font-semibold flex items-center justify-center ${
                      mode === 'signup'
                        ? 'bg-[#0A1022] text-snow'
                        : 'bg-snow/20 text-snow'
                    }`}
                  >
                    1
                  </span>
                  <span className="text-[13px] font-medium leading-snug">
                    Create your account
                  </span>
                </div>

                {/* Step 2 */}
                <div className="rounded-[20px] p-4 h-[140px] flex flex-col justify-between bg-snow/10 text-snow border border-snow/15 backdrop-blur-md">
                  <span className="h-6 w-6 rounded-full text-[12px] font-semibold flex items-center justify-center bg-snow/20 text-snow">
                    2
                  </span>
                  <span className="text-[13px] font-medium leading-snug">
                    Build your first habit
                  </span>
                </div>

                {/* Step 3 */}
                <div className="rounded-[20px] p-4 h-[140px] flex flex-col justify-between bg-snow/10 text-snow border border-snow/15 backdrop-blur-md">
                  <span className="h-6 w-6 rounded-full text-[12px] font-semibold flex items-center justify-center bg-snow/20 text-snow">
                    3
                  </span>
                  <span className="text-[13px] font-medium leading-snug">
                    Start a focus session
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="p-12 sm:p-14 flex flex-col justify-center bg-surface/40">
            <div className="max-w-[380px] w-full mx-auto">
              {/* Checkout Intent Banner (Desktop) */}
              {hasPlanIntent && (
                <div className="mb-6 rounded-xl text-sm px-4 py-3 bg-[var(--primary-soft)] text-[var(--primary-text)] font-medium text-center">
                  {mode === 'signup'
                    ? 'Create your account to continue to Focalyst Pro. You will go to secure checkout next.'
                    : 'Sign in to continue to Focalyst Pro. You will go to secure checkout next.'}
                </div>
              )}

              {/* CHECK INBOX PANEL (Shared component replaces form area) */}
              {showCheckInbox ? (
                <CheckInboxPanel
                  email={email}
                  onUseDifferentEmail={() => {
                    setShowCheckInbox(false);
                    setMessage('');
                    setExistingAccountMismatch(false);
                    setLoginInvalidCreds(false);
                  }}
                />
              ) : (
                <>
                  {/* Form Title & Subtitle */}
                  <h1 className="font-ui text-[26px]/[32px] font-semibold text-ink">
                    {mode === 'login'
                      ? 'Welcome back'
                      : mode === 'reset'
                      ? 'Reset password'
                      : 'Create your account'}
                  </h1>
                  <p className="mt-1.5 text-[14px] text-ink-2">
                    {mode === 'login'
                      ? 'Log in to continue to Focalyst.'
                      : mode === 'reset'
                      ? 'Enter your email to receive a password reset link.'
                      : 'Start owning your time in under a minute.'}
                  </p>

                  {/* Social Row */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="h-12 rounded-[14px] bg-surface border border-line-strong text-ink hover:bg-surface-2 flex items-center justify-center gap-2.5 text-[14px] font-medium transition-all shadow-[var(--shadow-1)] cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAppleSignIn}
                      className="h-12 rounded-[14px] bg-[#05070F] text-snow dark:bg-snow dark:text-[#05070F] hover:opacity-90 flex items-center justify-center gap-2 text-[14px] font-medium transition-all shadow-[var(--shadow-1)] cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                    >
                      <AppleIcon className="h-[18px] w-[18px] -translate-y-px" />
                      <span>Apple</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px bg-line flex-1" />
                    <span className="text-[12px] text-ink-3 uppercase tracking-wider font-medium">
                      or
                    </span>
                    <div className="h-px bg-line flex-1" />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* Full name (Signup only) */}
                    {mode === 'signup' && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="full-name"
                          className="text-[13px] font-medium text-ink-2"
                        >
                          Full name
                        </label>
                        <input
                          id="full-name"
                          type="text"
                          autoComplete="name"
                          required
                          placeholder="Jane Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 px-3.5 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                        />
                      </div>
                    )}

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email-input"
                        className="text-[13px] font-medium text-ink-2"
                      >
                        Email
                      </label>
                      <input
                        id="email-input"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 px-3.5 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                      />
                    </div>

                    {/* Password */}
                    {mode !== 'reset' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="password-input"
                            className="text-[13px] font-medium text-ink-2"
                          >
                            Password
                          </label>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            id="password-input"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 pl-3.5 pr-10 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 text-ink-3 hover:text-ink cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {/* Forgot password link under password field */}
                        {mode === 'login' && (
                          <div className="flex justify-end pt-1">
                            <Link
                              href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                              className="text-[13px] text-ink-2 hover:text-ink hover:underline transition-colors cursor-pointer"
                            >
                              Forgot password?
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline account exists mismatch (TASK 1.2.c) */}
                    {existingAccountMismatch && (
                      <div className="rounded-[14px] bg-surface-2 border border-line p-3.5 space-y-2 text-left">
                        <p className="text-[13px] text-ink-2 leading-snug">
                          An account with this email already exists. Log in or reset your password.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setExistingAccountMismatch(false);
                              switchMode('login');
                            }}
                            className="h-8 px-3 rounded-[10px] bg-primary text-snow text-[13px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
                          >
                            Log in
                          </button>
                          <Link
                            href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                            className="h-8 px-3 rounded-[10px] bg-surface border border-line text-ink text-[13px] font-medium hover:bg-surface-3 transition-colors inline-flex items-center justify-center cursor-pointer"
                          >
                            Reset password
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Inline login invalid credentials (TASK 2.3) */}
                    {loginInvalidCreds && (
                      <div role="alert" className="text-[13px] text-center pt-1 text-danger">
                        <span>That email and password do not match. Try again or </span>
                        <Link
                          href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'}
                          className="underline hover:text-ink font-medium cursor-pointer"
                        >
                          reset your password
                        </Link>
                        .
                      </div>
                    )}

                    {/* General Error / Success Message */}
                    {message && (
                      <p
                        role={isSuccess ? 'status' : 'alert'}
                        className={`text-[13px] text-center pt-1 ${
                          isSuccess ? 'text-emerald-500' : 'text-danger'
                        }`}
                      >
                        {message}
                      </p>
                    )}

                    {/* Primary Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 w-full rounded-[14px] bg-primary hover:bg-primary-hover text-snow font-medium text-[14px] mt-5 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>{submitButtonLabel}</span>
                    </button>
                  </form>

                  {/* Mode Switch Line */}
                  <div className="mt-5 text-center text-[13px] text-ink-2">
                    {mode === 'signup' ? (
                      <span>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="text-primary-text font-medium hover:underline cursor-pointer"
                        >
                          Log in
                        </button>
                      </span>
                    ) : (
                      <span>
                        New to Focalyst?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('signup')}
                          className="text-primary-text font-medium hover:underline cursor-pointer"
                        >
                          Create an account
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Terms microcopy */}
                  <p className="mt-6 text-center text-[12px] text-ink-3">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-ink">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline hover:text-ink">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-line border-t-primary animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
