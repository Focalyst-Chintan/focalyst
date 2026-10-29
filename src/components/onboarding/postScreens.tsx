'use client';
// Screens 28 to 32 after the save (WEB_ONBOARDING_DESIGN.md 4 and 9).
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Copy, Plug, QrCode, Share2 } from 'lucide-react';
import { Button, GlobalToastContainer, Skeleton, useToast } from '@/components/desktop/ui';
import type { PlanKey } from '@/lib/billing/checkout';
import { firstName, type GroupStepResult, type OnboardingPostState } from '@/lib/onboarding/draft';
import { retryGroup } from '@/lib/onboarding/groupStep';
import { announceCreatedCountdown } from '@/lib/onboarding/useOnboardingFollowUps';
import { buildStartingReport } from '@/lib/onboarding/startingReport';
import { hasStoreLinkEnv } from '@/lib/onboarding/steps';
import { fetchMyGroupLeaderboard, type GroupLeaderboardMember } from '@/lib/services/habitGroupService';
import { OnboardingStage, PlanPanelScroll, StepFrame, type FooterAction } from './OnboardingStage';
import { PlanPreview } from './PlanPreview';
import { StartingReport, type ReportMode } from './StartingReport';
import { MiniLeaderboard } from './groupVisuals';
import { PaywallScreen } from './PaywallScreen';
import { GET_APP_URL, StoreButtons, usePlatform } from './StoreButtons';
import { TextField } from './patterns';
import { useOnboardingKeys } from './useOnboardingKeys';
import { formatNumber } from './copy';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), {
  ssr: false,
  loading: () => <Skeleton className="h-[160px] w-[160px]" />,
});

/** NEXT_PUBLIC_WEB_TRIAL_DAYS as a positive whole number; 0 means no trial on the web. */
export function webTrialDays(): number {
  const n = Math.floor(Number(process.env.NEXT_PUBLIC_WEB_TRIAL_DAYS));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 28 for everyone with saved answers, 30 for free web users, 31 with a group. 29 is gone (REPORT R1). */
export function postSteps(post: OnboardingPostState, isPro: boolean, native: boolean): number[] {
  return [28, 30, 31, 32].filter((s) => {
    if (s === 28) return Boolean(post.answers && Object.keys(post.answers).length);
    if (s === 30) return !isPro && !native;
    if (s === 31) return post.group !== null;
    return true;
  });
}

type Patch = Partial<Omit<OnboardingPostState, 'savedAt'>>;

interface PostCtx {
  post: OnboardingPostState;
  pro: boolean;
  native: boolean;
  /** The next visible screen after `step`, or null at the end. */
  after: (step: number) => number | null;
  go: (step: number | null) => void;
  change: (patch: Patch) => void;
  done: (to: '/focus' | 'home') => void;
}

function useFooterKeys(primary: FooterAction | null) {
  useOnboardingKeys({ canContinue: Boolean(primary && !primary.disabled), onEnter: primary?.onClick });
}

// ---------- 28 · Your starting report (WEB_ONBOARDING_REPORT.md R1 and R3) ----------

function Screen28({ c }: { c: PostCtx }) {
  const titleId = useId();
  const saved = c.post.answers;
  const answers = useMemo(() => saved ?? {}, [saved]);
  const report = useMemo(
    () => buildStartingReport({
      answers,
      report: c.post.report,
      isPro: c.pro,
      today: new Date(),
      locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    }),
    [answers, c.post.report, c.pro]
  );
  const mode: ReportMode = c.native ? 'free-only' : c.pro ? 'full' : 'locked';
  const unlock = () => c.go(30);
  const primary = mode === 'locked'
    ? { label: 'Unlock my full report', onClick: unlock }
    : { label: 'Continue', onClick: () => c.go(c.after(28)) };
  const secondary = mode === 'locked' ? { label: 'Maybe later', onClick: () => c.go(c.after(30)) } : null;
  useFooterKeys(primary);
  return (
    <StepFrame
      titleId={titleId}
      overline={report.overline}
      title={report.title}
      subtitle={<span className="text-[13px] text-ink-3">{report.subtitle}</span>}
      primary={primary}
      secondary={secondary}
      secondaryStart
      readingWidth
      scrollFade
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      body={<StartingReport report={report} mode={mode} answers={answers} plan={c.post.plan ?? null} onUnlock={unlock} header={false} />}
    />
  );
}

// ---------- 31 · Your group ----------

const INVITE_FALLBACK = (habit: string | null, code: string) =>
  `Join my habit group on Focalyst.${habit ? ` We're tracking ${habit}.` : ''} Code: ${code}. focalyst.online`;

/** One line matched to the error the join function returns. */
export function joinFailLine(error: string): string {
  const e = error.toLowerCase();
  if (/already/.test(e)) return "You're already in a group. You can manage it from Plan › Habits.";
  if (/full|max/.test(e)) return 'This group already has 5 people.';
  if (/invalid|not found|no group|not exist|check/.test(e)) return 'Check the code with your friend and try again.';
  return 'Something went wrong. You can try again from Plan › Habits.';
}

function useStandings(enabled: boolean) {
  const [members, setMembers] = useState<GroupLeaderboardMember[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetchMyGroupLeaderboard()
      .then((d) => { if (live) setMembers(d.in_group ? [...d.members].sort((a, b) => b.streak - a.streak) : []); })
      .catch(() => { if (live) setMembers([]); });
    return () => { live = false; };
  }, [enabled]);
  return members;
}

function Standings({ members, invites = false }: { members: GroupLeaderboardMember[]; invites?: boolean }) {
  const open = invites ? Math.max(0, 5 - members.length) : 0;
  return (
    <div className="rounded-[16px] border border-line bg-surface-2 p-3" aria-label="Group standings">
      <ol className="flex flex-col gap-1.5">
        {members.map((m, i) => (
          <li key={m.user_id} className="flex h-11 items-center gap-3 rounded-[12px] bg-surface px-3">
            <span className="w-5 text-[13px] font-semibold tabular-nums text-ink-2">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
              {m.display_name || 'Member'}{m.is_me ? ' (you)' : ''}
            </span>
            <span className="text-[13px] font-medium tabular-nums text-ink-2">
              {formatNumber(m.streak, 0)} {m.streak === 1 ? 'day' : 'days'}
            </span>
          </li>
        ))}
        {Array.from({ length: open }, (_, i) => (
          <li key={`invite-${i}`} className="flex h-11 items-center gap-3 rounded-[12px] border border-dashed border-line-strong px-3 text-[14px] text-ink-3">
            Invite a friend
          </li>
        ))}
      </ol>
    </div>
  );
}

function GroupStarted({ c, result }: { c: PostCtx; result: Extract<GroupStepResult, { status: 'created' | 'existing' }> & { code: string } }) {
  const titleId = useId();
  const toast = useToast();
  const members = useStandings(true);
  const code = result.code;
  const name = firstName(c.post.name);
  const habit = c.post.habitName;
  const emoji = c.post.answers?.habits?.find((h) => h.name === habit)?.icon;

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(msg, 'success');
    } catch {
      toast.show('Could not copy. Select the code and copy it.', 'error');
    }
  };
  const share = async () => {
    const text = INVITE_FALLBACK(habit, code);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    await copy(text, 'Invite copied');
  };

  const primary = { label: 'Share invite', onClick: share };
  const secondary = { label: 'Done', onClick: () => c.go(c.after(31)) };
  useFooterKeys(primary);

  return (
    <StepFrame
      titleId={titleId}
      title="Your group is ready."
      subtitle="Share this code with up to 4 friends. They join with it in Focalyst."
      primary={primary}
      secondary={secondary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      body={
        <div className="flex flex-col gap-5">
          <div>
            <p
              aria-label={`Invite code ${code.split('').join(' ')}`}
              className="ob-gradient-text font-ui text-[56px] font-semibold leading-[60px] tracking-[0.12em] tabular-nums"
            >
              {code}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={() => copy(code, 'Code copied')}>
                Copy code
              </Button>
              <Button variant="ghost" icon={<Share2 className="h-4 w-4" aria-hidden />} onClick={share}>
                Share
              </Button>
            </div>
          </div>
          {members && members.length > 0 ? <Standings members={members} invites /> : <MiniLeaderboard name={name} emoji={emoji} />}
        </div>
      }
    />
  );
}

function GroupJoined({ c }: { c: PostCtx }) {
  const titleId = useId();
  const members = useStandings(true);
  const friends = members ? Math.max(0, members.length - 1) : null;
  const primary = { label: 'Continue', onClick: () => c.go(c.after(31)) };
  useFooterKeys(primary);
  return (
    <StepFrame
      titleId={titleId}
      title="You're in."
      subtitle={friends ? `You and ${formatNumber(friends, 0)} ${friends === 1 ? 'friend' : 'friends'} are tracking together.` : undefined}
      primary={primary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      body={members === null ? <Skeleton className="h-[120px] w-full" /> : members.length ? <Standings members={members} /> : null}
    />
  );
}

function GroupFailed({ c, result }: { c: PostCtx; result: Extract<GroupStepResult, { status: 'failed' }> }) {
  const titleId = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(result.error);
  const habitId = c.post.groupHabitId ?? null;
  const join = result.mode === 'join';
  const ready = Boolean(habitId) && (!join || code.length === 6);

  const tryAgain = async () => {
    if (!habitId || !ready || busy) return;
    setBusy(true);
    const r = await retryGroup({ mode: join ? 'join' : 'create', habitId, code: join ? code : undefined });
    setBusy(false);
    if (!r) {
      setError('offline');
      return;
    }
    if (r.status === 'failed') setError(r.error);
    else c.change({ group: r });
  };

  const primary = habitId ? { label: busy ? 'Trying again' : 'Try again', onClick: tryAgain, disabled: !ready || busy } : null;
  const secondary = { label: 'Skip for now', onClick: () => c.go(c.after(31)) };
  useFooterKeys(primary);

  return (
    <StepFrame
      titleId={titleId}
      title={join ? "That code didn't work." : "That didn't work."}
      subtitle={join ? joinFailLine(error) : 'Something went wrong. You can try again from Plan › Habits.'}
      primary={primary}
      secondary={secondary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      focusTitle
      body={
        join && habitId ? (
          <TextField
            aria-label="Invite code"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.trim().toUpperCase().slice(0, 6))}
            className="tracking-[0.12em] uppercase"
          />
        ) : undefined
      }
    />
  );
}

function GroupOffline({ c }: { c: PostCtx }) {
  const titleId = useId();
  const primary = { label: 'Continue', onClick: () => c.go(c.after(31)) };
  useFooterKeys(primary);
  return (
    <StepFrame
      titleId={titleId}
      title="Almost there."
      subtitle="We'll finish setting up your group next time you open Focalyst."
      primary={primary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
    />
  );
}

function Screen31({ c }: { c: PostCtx }) {
  const g = c.post.group;
  if (!g || g.status === 'offline') return <GroupOffline c={c} />;
  if (g.status === 'failed') return <GroupFailed key={g.error} c={c} result={g} />;
  if ((g.status === 'created' || g.status === 'existing') && g.code) return <GroupStarted c={c} result={{ ...g, code: g.code }} />;
  return <GroupJoined c={c} />;
}

// ---------- 32 · You're all set ----------

function StepRow({
  icon: Icon, label, line, href, onClick, expanded, children, className = '',
}: {
  className?: string;
  icon: LucideIcon;
  label: string;
  line: string;
  href?: string;
  onClick?: () => void;
  expanded?: boolean;
  children?: ReactNode;
}) {
  const inner = (
    <>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-text">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="block text-[13px] text-ink-2">{line}</span>
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden />
    </>
  );
  const cls =
    'flex w-full items-center gap-3 rounded-[14px] p-3 text-left hover:bg-surface-2 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]';
  return (
    <li className={className}>
      {href ? (
        <Link href={href} className={cls}>{inner}</Link>
      ) : (
        <button type="button" onClick={onClick} aria-expanded={children ? expanded : undefined} className={cls}>{inner}</button>
      )}
      {children}
    </li>
  );
}

function Screen32({ c }: { c: PostCtx }) {
  const titleId = useId();
  const [qrOpen, setQrOpen] = useState(false);
  const platform = usePlatform() ?? 'other';
  const name = firstName(c.post.name);
  const showApp = hasStoreLinkEnv() && !c.native;

  const primary = { label: 'Start my first focus session', onClick: () => c.done('/focus') };
  const secondary = { label: 'Go to my plan', onClick: () => c.done('home'), variant: 'secondary' as const };
  useFooterKeys(primary);

  const rows = showApp || c.pro;
  return (
    <StepFrame
      titleId={titleId}
      title={name ? `You're all set, ${name}.` : "You're all set."}
      subtitle="Your plan is ready. The best time to start is now."
      primary={primary}
      secondary={secondary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      body={
        rows ? (
          <ul className="frost flex flex-col gap-1 rounded-[20px] p-2" aria-label="Next steps">
            {showApp && (
              <>
                {/* Desktop: opens inline into a QR code for /get-app */}
                <StepRow
                    className="hidden lg:block"
                    icon={QrCode}
                    label="Get the phone app"
                    line="Widgets, blocking and your plan on the go."
                    onClick={() => setQrOpen((o) => !o)}
                    expanded={qrOpen}
                  >
                    {qrOpen && (
                      <div className="ob-fade-up flex items-center gap-4 px-3 pb-3 pt-1">
                        <div className="rounded-[12px] bg-surface p-2 text-ink">
                          <QRCodeSVG value={GET_APP_URL} size={160} fgColor="currentColor" bgColor="transparent" title="QR code for the Focalyst phone app" />
                        </div>
                        <p className="text-[13px] leading-[20px] text-ink-2">Scan with your phone. Log in with the same account.</p>
                      </div>
                    )}
                  </StepRow>
                {/* Phone browser: the store button for this platform */}
                <li className="flex flex-col gap-2 p-3 lg:hidden">
                  <span className="text-[15px] font-semibold text-ink">Get the phone app</span>
                  <StoreButtons platform={platform} />
                </li>
              </>
            )}
            {c.pro && (
              <StepRow icon={Plug} label="Connect Claude or ChatGPT" line="Ask about your plan from your AI app." href="/mcp" />
            )}
          </ul>
        ) : undefined
      }
    />
  );
}

// ---------- The post-save flow ----------

export function PostScreens({
  post, isPro, native, onChange, onDone,
}: {
  post: OnboardingPostState;
  isPro: boolean;
  native: boolean;
  onChange: (patch: Patch) => void;
  /** A screen 32 button: clears onboarding:post:v1 and leaves. */
  onDone: (to: '/focus' | 'home') => void;
}) {
  const toast = useToast();
  const pro = isPro || Boolean(post.purchased);
  const steps = postSteps(post, pro, native);
  const step = steps.includes(post.step) ? post.step : steps.find((s) => s > post.step) ?? 32;
  const after = (s: number) => steps.find((k) => k > s) ?? null;

  // A countdown the payment success page just added (8.6).
  useEffect(() => { announceCreatedCountdown(toast); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const c: PostCtx = {
    post,
    pro,
    native,
    after,
    go: (s) => onChange({ step: s ?? 32 }),
    change: onChange,
    done: onDone,
  };

  const wide = step === 30;
  const planPanel = (
    <PlanPanelScroll>
      <PlanPreview answers={post.answers ?? {}} skipped={post.skipped ?? []} isPro={pro} step={step} className="ob-fade-slow" />
    </PlanPanelScroll>
  );

  return (
    <>
      <GlobalToastContainer />
      <OnboardingStage
        step={step}
        flow={{ answers: post.answers ?? {}, signedIn: true, isPro: pro, native, hasStoreLink: hasStoreLinkEnv() }}
        wide={wide}
        showBack={false}
        onBack={() => {}}
        planPanel={planPanel}
      >
        <div key={step} className="flex min-h-0 flex-1 flex-col">
          {step === 28 && <Screen28 c={c} />}
          {step === 30 && (
            <PaywallScreen
              post={post}
              trialDays={webTrialDays()}
              onLeave={(plan: PlanKey) => onChange({ step: 30, checkoutPending: plan })}
              onAlreadyPro={() => onChange({ purchased: true, checkoutPending: null, step: steps.includes(28) ? 28 : after(30) ?? 32 })}
              onClose={() => onChange({ checkoutPending: null, step: after(30) ?? 32 })}
            />
          )}
          {step === 31 && <Screen31 c={c} />}
          {step === 32 && <Screen32 c={c} />}
        </div>
      </OnboardingStage>
    </>
  );
}

export default PostScreens;
