'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  User as UserIcon,
  Palette,
  Bell,
  Sparkles,
  Shield,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { emitDataChanged } from '@/lib/events';
import { MemberAvatar } from '@/components/desktop/ui/MemberAvatar';
import { Button } from '@/components/desktop/ui/Button';
import { Input } from '@/components/desktop/ui/Input';
import { Modal } from '@/components/desktop/ui/Modal';
import { useToast } from '@/components/desktop/ui/Toast';
import { openBillingPortal } from '@/lib/billing/checkout';
import { useCurrency, PRICES } from '@/lib/billing/useCurrency';

type Tab = 'profile' | 'appearance' | 'notifications' | 'pro' | 'account';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  plan_expires_at?: string | null;
  billing_provider?: string | null;
  timezone?: string | null;
  task_reminders_enabled?: boolean;
  habit_reminders_enabled?: boolean;
  pomodoro_alerts_enabled?: boolean;
}

export default function DesktopSettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'profile';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const cur = useCurrency();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullNameInput, setFullNameInput] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isRestoringPurchase, setIsRestoringPurchase] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as Tab;
    if (tabFromUrl && ['profile', 'appearance', 'notifications', 'pro', 'account'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    startTransition(() => {
      router.replace(`/settings?tab=${tab}`);
    });
  };

  useEffect(() => {
    try {
      const rm = localStorage.getItem('fx-reduce-motion') === '1';
      setReduceMotion(rm);
    } catch {
      // ignore
    }
  }, []);

  const toggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try {
      localStorage.setItem('fx-reduce-motion', next ? '1' : '0');
      if (next) {
        document.documentElement.classList.add('fx-reduce-motion');
      } else {
        document.documentElement.classList.remove('fx-reduce-motion');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select(
            'id, full_name, plan, plan_expires_at, billing_provider, timezone, task_reminders_enabled, habit_reminders_enabled, pomodoro_alerts_enabled'
          )
          .eq('id', session.user.id)
          .maybeSingle();

        const data: UserData = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: profile?.full_name || '',
          plan: profile?.plan || 'free',
          plan_expires_at: profile?.plan_expires_at,
          billing_provider: profile?.billing_provider,
          timezone:
            profile?.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            'UTC',
          task_reminders_enabled: profile?.task_reminders_enabled ?? true,
          habit_reminders_enabled: profile?.habit_reminders_enabled ?? true,
          pomodoro_alerts_enabled: profile?.pomodoro_alerts_enabled ?? true,
        };

        setUserData(data);
        setFullNameInput(data.full_name);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const handleFullNameBlur = async () => {
    if (!userData || fullNameInput.trim() === userData.full_name) return;
    const newName = fullNameInput.trim();
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName })
        .eq('id', userData.id);

      if (error) throw error;
      setUserData((prev) => (prev ? { ...prev, full_name: newName } : null));
      toast.show('Saved');
      emitDataChanged('user');
    } catch {
      toast.show('Could not save name');
    }
  };

  const handleToggleNotification = async (
    key: 'task_reminders_enabled' | 'habit_reminders_enabled' | 'pomodoro_alerts_enabled'
  ) => {
    if (!userData) return;
    const prevVal = userData[key];
    const nextVal = !prevVal;

    // Optimistic
    setUserData((prev) => (prev ? { ...prev, [key]: nextVal } : null));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ [key]: nextVal })
        .eq('id', userData.id);

      if (error) throw error;
    } catch {
      // Revert
      setUserData((prev) => (prev ? { ...prev, [key]: prevVal } : null));
      toast.show('Could not update notification setting');
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    if (!userData) return;
    setUserData((prev) => (prev ? { ...prev, timezone: tz } : null));
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ timezone: tz })
        .eq('id', userData.id);

      if (error) throw error;
      toast.show('Saved');
      emitDataChanged('user');
    } catch {
      toast.show('Could not update time zone');
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const handleRestorePurchase = async () => {
    setIsRestoringPurchase(true);
    try {
      const res = await fetch('/api/billing/sync-me', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.plan && data.plan !== 'free') {
        toast.show('Your Focalyst Pro is active.');
        emitDataChanged('profile');
        setUserData((prev) => (prev ? { ...prev, plan: data.plan } : null));
      } else {
        toast.show('We could not find a purchase for this account. Email contactfocalyst@gmail.com and we will sort it out.');
      }
    } catch {
      toast.show('We could not find a purchase for this account. Email contactfocalyst@gmail.com and we will sort it out.');
    } finally {
      setIsRestoringPurchase(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
      </div>
    );
  }

  const isPro = userData?.plan && userData.plan !== 'free';
  const proPlanName =
    userData?.plan === 'lifetime'
      ? 'Lifetime'
      : userData?.plan === 'pro_yearly'
      ? 'Pro Annual'
      : 'Pro Monthly';

  return (
    <div className="mx-auto w-full max-w-[1040px] px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-[28px] leading-[34px] text-ink">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Manage your account preferences and workspace.
        </p>
      </div>

      <div className="grid grid-cols-[220px_minmax(0,720px)] items-start gap-6">
        {/* Left Nav */}
        <nav className="frost space-y-1 rounded-[20px] p-3" aria-label="Settings navigation">
          {[
            { id: 'profile' as Tab, label: 'Profile', icon: UserIcon },
            { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
            { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
            { id: 'pro' as Tab, label: 'Focalyst Pro', icon: Sparkles },
            { id: 'account' as Tab, label: 'Account', icon: Shield },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`flex h-10 w-full items-center gap-3 rounded-[12px] px-3.5 text-left text-[14px] font-medium transition-colors ${
                  active
                    ? 'fx-active-pill bg-surface-2 font-semibold text-ink shadow-sm'
                    : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-primary-text' : 'text-ink-3'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Content */}
        <div className="min-w-0">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="frost space-y-6 rounded-[24px] p-7">
              <div className="border-b border-line pb-5">
                <h2 className="text-[17px] font-semibold text-ink">Profile</h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  Your personal details in Focalyst.
                </p>
              </div>

              <div className="flex items-center gap-5">
                <MemberAvatar
                  userId={userData?.id || 'user'}
                  name={userData?.full_name}
                  size={72}
                  ring
                />
                <div>
                  <div className="text-[15px] font-semibold text-ink">
                    {userData?.full_name || 'Your name'}
                  </div>
                  <div className="text-[13px] text-ink-3">{userData?.email}</div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                    Full name
                  </label>
                  <Input
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    onBlur={handleFullNameBlur}
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                    Email address
                  </label>
                  <Input value={userData?.email || ''} readOnly disabled />
                  <p className="mt-1.5 text-[12px] text-ink-3">
                    Your email is managed by your account sign in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="frost space-y-6 rounded-[24px] p-7">
              <div className="border-b border-line pb-5">
                <h2 className="text-[17px] font-semibold text-ink">Appearance</h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  Customise the look and motion of your interface.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {/* Light */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`group relative flex flex-col items-center rounded-[18px] border p-3 transition-all ${
                      theme === 'light'
                        ? 'border-primary ring-2 ring-primary/20 bg-surface-2'
                        : 'border-line hover:border-line-strong bg-surface'
                    }`}
                  >
                    <div className="relative h-16 w-full rounded-[10px] border border-black/10 bg-[#FAFAFC] p-2 overflow-hidden shadow-sm">
                      <div className="h-2 w-12 rounded bg-[#0A1022]/80 mb-1.5" />
                      <div className="h-1.5 w-20 rounded bg-[#4B5675]/40 mb-1" />
                      <div className="h-1.5 w-16 rounded bg-[#4B5675]/30" />
                    </div>
                    <span className="mt-2.5 text-[13px] font-medium text-ink">Light</span>
                    {theme === 'light' && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-snow">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`group relative flex flex-col items-center rounded-[18px] border p-3 transition-all ${
                      theme === 'dark'
                        ? 'border-primary ring-2 ring-primary/20 bg-surface-2'
                        : 'border-line hover:border-line-strong bg-surface'
                    }`}
                  >
                    <div className="relative h-16 w-full rounded-[10px] border border-snow/10 bg-[#070B18] p-2 overflow-hidden shadow-sm">
                      <div className="h-2 w-12 rounded bg-snow/90 mb-1.5" />
                      <div className="h-1.5 w-20 rounded bg-snow/40 mb-1" />
                      <div className="h-1.5 w-16 rounded bg-snow/25" />
                    </div>
                    <span className="mt-2.5 text-[13px] font-medium text-ink">Dark</span>
                    {theme === 'dark' && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-snow">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>

                  {/* System */}
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`group relative flex flex-col items-center rounded-[18px] border p-3 transition-all ${
                      theme === 'system'
                        ? 'border-primary ring-2 ring-primary/20 bg-surface-2'
                        : 'border-line hover:border-line-strong bg-surface'
                    }`}
                  >
                    <div className="relative h-16 w-full rounded-[10px] border border-line overflow-hidden shadow-sm flex">
                      <div className="w-1/2 h-full bg-[#FAFAFC] p-2">
                        <div className="h-2 w-8 rounded bg-[#0A1022]/80 mb-1" />
                        <div className="h-1.5 w-10 rounded bg-[#4B5675]/40" />
                      </div>
                      <div className="w-1/2 h-full bg-[#070B18] p-2">
                        <div className="h-2 w-8 rounded bg-snow/90 mb-1" />
                        <div className="h-1.5 w-10 rounded bg-snow/40" />
                      </div>
                    </div>
                    <span className="mt-2.5 text-[13px] font-medium text-ink">System</span>
                    {theme === 'system' && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-snow">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Reduce motion */}
              <div className="flex items-center justify-between border-t border-line pt-5">
                <div>
                  <div className="text-[14px] font-semibold text-ink">
                    Reduce motion
                  </div>
                  <div className="text-[13px] text-ink-3">
                    Minimises ambient background blobs and decorative animations.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reduceMotion}
                  onClick={toggleReduceMotion}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                    reduceMotion ? 'bg-primary' : 'bg-surface-3'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-snow shadow ring-0 transition duration-200 ease-in-out ${
                      reduceMotion ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="frost space-y-6 rounded-[24px] p-7">
              <div className="border-b border-line pb-5">
                <h2 className="text-[17px] font-semibold text-ink">Notifications</h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  Choose which alerts and reminders you receive.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: 'task_reminders_enabled' as const,
                    title: 'Task reminders',
                    desc: 'Alerts when scheduled tasks are due.',
                    checked: userData?.task_reminders_enabled ?? true,
                  },
                  {
                    key: 'habit_reminders_enabled' as const,
                    title: 'Habit reminders',
                    desc: 'Reminders to check off habits throughout the day.',
                    checked: userData?.habit_reminders_enabled ?? true,
                  },
                  {
                    key: 'pomodoro_alerts_enabled' as const,
                    title: 'Focus alerts',
                    desc: 'Audio and visual cues when focus and break intervals end.',
                    checked: userData?.pomodoro_alerts_enabled ?? true,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-[16px] bg-surface-2/60 p-4"
                  >
                    <div>
                      <div className="text-[14px] font-semibold text-ink">
                        {item.title}
                      </div>
                      <div className="text-[13px] text-ink-3">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.checked}
                      onClick={() => handleToggleNotification(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                        item.checked ? 'bg-primary' : 'bg-surface-3'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-snow shadow ring-0 transition duration-200 ease-in-out ${
                          item.checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FOCALYST PRO */}
          {activeTab === 'pro' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] p-7 text-snow">
                <div className="ambient-grain pointer-events-none absolute inset-0 opacity-20" />
                <div className="relative z-10">
                  {isPro ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-snow" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-snow/80">
                          Active Membership
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-[28px] text-snow">
                        {proPlanName}
                      </h2>
                      <p className="mt-1 text-[14px] text-snow/80">
                        {userData?.plan === 'lifetime'
                          ? 'Yours for life'
                          : userData?.plan_expires_at
                          ? `Renewal date: ${new Date(
                              userData.plan_expires_at
                            ).toLocaleDateString()}`
                          : 'Pro membership active'}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            if (userData?.billing_provider === 'apple') {
                              toast.show('Your plan is managed in the App Store', 'info');
                            } else if (userData?.billing_provider === 'google') {
                              toast.show('Your plan is managed in Google Play', 'info');
                            } else {
                              const res = await openBillingPortal();
                              if (!res.ok) {
                                toast.show(res.message || 'Could not open billing portal', 'error');
                              }
                            }
                          }}
                          className="bg-snow/15 text-snow border-snow/30 hover:bg-snow/25"
                        >
                          Manage plan
                        </Button>
                        {(userData?.plan === 'pro_monthly' || userData?.plan === 'pro_yearly') && (
                          <Button
                            variant="secondary"
                            onClick={() => router.push('/paywall')}
                            className="bg-snow text-[#0B2CB1] hover:bg-snow/90 font-semibold"
                          >
                            Upgrade to Lifetime
                          </Button>
                        )}
                      </div>
                      {(userData?.plan === 'pro_monthly' || userData?.plan === 'pro_yearly') && (
                        <p style={{ color: 'var(--ink-3)', fontSize: '13px' }} className="mt-2 text-snow/75">
                          Your current plan keeps renewing until you cancel it in Manage plan.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h2 className="font-display text-[28px] leading-tight text-snow">
                        Focalyst Pro
                      </h2>
                      <div className="mt-4 space-y-2 text-[14px] text-snow/90">
                        {[
                          'More habits, notes and voice notes',
                          'Higher daily limits for Focalyst AI',
                          'Productivity score and weekly Catalyst Report',
                          'Custom focus timers, all presets and up to 3 countdowns',
                          'Early access to MCP',
                        ].map((b) => (
                          <div key={b} className="flex items-center gap-2.5">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-snow/20 text-snow">
                              <Check className="h-3 w-3" strokeWidth={2.5} />
                            </span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 text-[13px] text-snow/75">
                        {cur ? (
                          `From ${PRICES[cur].monthly} a month · ${PRICES[cur].lifetime} Lifetime`
                        ) : (
                          <span className="inline-block w-32 h-4 bg-snow/20 rounded animate-pulse" />
                        )}
                      </div>

                      <div className="mt-6">
                        <Button
                          variant="secondary"
                          onClick={() => router.push('/paywall')}
                          className="bg-snow text-[#0B2CB1] hover:bg-snow/90 font-semibold"
                        >
                          Upgrade to Pro
                        </Button>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleRestorePurchase}
                            disabled={isRestoringPurchase}
                            className="text-[13px] text-snow/75 hover:text-snow underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {isRestoringPurchase ? 'Checking your purchase' : 'Already paid? Restore purchase'}
                          </button>
                        </div>
                        <p className="mt-2 text-[12px] text-snow/60">
                          Final price and any taxes are shown at checkout.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="frost space-y-6 rounded-[24px] p-7">
              <div className="border-b border-line pb-5">
                <h2 className="text-[17px] font-semibold text-ink">Account</h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  System settings, time zone and data management.
                </p>
              </div>

              {/* Time Zone */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  Time zone
                </label>
                <select
                  value={userData?.timezone || 'UTC'}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="h-10 w-full rounded-[12px] border border-line bg-surface px-3 text-[14px] text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                >
                  {typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
                    ? Intl.supportedValuesOf('timeZone').map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))
                    : [
                        'UTC',
                        'America/New_York',
                        'America/Los_Angeles',
                        'Europe/London',
                        'Asia/Kolkata',
                        'Asia/Tokyo',
                      ].map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                </select>
              </div>

              {/* Sign out */}
              <div className="border-t border-line pt-5">
                <Button variant="secondary" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-[20px] border border-danger/30 bg-danger/5 p-5">
                <h3 className="text-[15px] font-semibold text-danger">
                  Delete account
                </h3>
                <p className="mt-1 text-[13px] leading-[20px] text-ink-2">
                  Deleting your account permanently removes your data. We do not keep backups of deleted accounts.
                </p>
                <div className="mt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete account"
      >
        <div className="space-y-4">
          <p className="text-[14px] leading-[22px] text-ink-2">
            Are you sure you want to delete your account? This action is permanent and removes all your habits, tasks, focus records, notes and personal data immediately.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <a
              href="mailto:contactfocalyst@gmail.com?subject=Delete%20my%20account"
              className="inline-flex h-10 items-center justify-center rounded-[12px] bg-danger px-4 text-[14px] font-medium text-snow hover:bg-danger/90"
            >
              Request deletion
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
