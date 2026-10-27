'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Eye, Loader2, Plus, ShieldOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isPaidPlan } from '@/lib/featureGates';
import { Button } from '@/components/desktop/ui/Button';
import { Switch } from '@/components/desktop/ui/Switch';

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';
const GENERIC_ERROR = 'Something went wrong. Please try again.';

type Client = { id?: string; name: string; logo?: string };
type Credits = { has_account: boolean; balance?: number; monthly_credits: number } | null;

type View =
  | { kind: 'loading' }
  | { kind: 'expired' }
  | { kind: 'not_pro'; client: Client }
  | { kind: 'consent'; client: Client; host: string; credits: Credits };

const fmt = (n: number) => n.toLocaleString('en-US');

function isLoopback(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}

function ConsentCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-strong w-full max-w-[440px] rounded-[24px] p-6 sm:p-7">{children}</div>
  );
}

function ClientMark({ client }: { client: Client }) {
  if (client.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={client.logo}
        alt=""
        referrerPolicy="no-referrer"
        className="h-12 w-12 rounded-[14px] border border-line bg-surface object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft font-display text-[22px] text-primary-text">
      {(client.name.trim()[0] || '?').toUpperCase()}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[14px] leading-snug text-ink-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const authorizationId = searchParams.get('authorization_id');

  const [view, setView] = useState<View>({ kind: 'loading' });
  const [allowWrites, setAllowWrites] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!authorizationId) {
        setView({ kind: 'expired' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(
          '/login?next=' + encodeURIComponent('/oauth/consent?authorization_id=' + authorizationId)
        );
        return;
      }

      const { data: details, error: detailsError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (detailsError || !details) {
        setView({ kind: 'expired' });
        return;
      }
      if (!('authorization_id' in details)) {
        // Consent already given: Supabase hands back the redirect straight away
        window.location.assign(details.redirect_url);
        return;
      }

      const client: Client = {
        id: details.client?.id || undefined,
        name: details.client?.name?.trim() || 'Unknown app',
        logo: details.client?.logo_uri?.startsWith('https://') ? details.client.logo_uri : undefined,
      };
      let host = '';
      try {
        host = new URL(details.redirect_uri).hostname;
      } catch {
        host = details.redirect_uri;
      }

      const [{ data: profile }, { data: credits }] = await Promise.all([
        supabase.from('users').select('plan, plan_expires_at, full_name').eq('id', user.id).maybeSingle(),
        supabase.rpc('mcp_my_credits'),
      ]);
      if (cancelled) return;

      if (!isPaidPlan(profile?.plan, profile?.plan_expires_at)) {
        setView({ kind: 'not_pro', client });
        return;
      }
      setView({ kind: 'consent', client, host, credits: (credits as Credits) ?? null });
    }

    load().catch(() => {
      if (!cancelled) setView({ kind: 'expired' });
    });
    return () => {
      cancelled = true;
    };
  }, [authorizationId, router, supabase]);

  async function handleCancel() {
    if (!authorizationId) return;
    setWorking(true);
    setError('');
    const { data, error: denyError } = await supabase.auth.oauth.denyAuthorization(authorizationId, {
      skipBrowserRedirect: true,
    });
    if (denyError || !data?.redirect_url) {
      setWorking(false);
      setError(GENERIC_ERROR);
      return;
    }
    window.location.assign(data.redirect_url);
  }

  async function handleAllow(client: Client) {
    if (!authorizationId) return;
    setWorking(true);
    setError('');
    try {
      if (client.id) {
        const { error: consentError } = await supabase.rpc('mcp_record_consent', {
          p_client_id: client.id,
          p_client_name: client.name,
          p_allow_writes: allowWrites,
        });
        if (consentError) throw consentError;
      }
      const { data, error: approveError } = await supabase.auth.oauth.approveAuthorization(authorizationId, {
        skipBrowserRedirect: true,
      });
      if (approveError || !data?.redirect_url) throw approveError ?? new Error('no redirect');
      window.location.assign(data.redirect_url);
    } catch {
      setWorking(false);
      setError(GENERIC_ERROR);
    }
  }

  if (view.kind === 'loading') {
    return (
      <ConsentCard>
        <div className="flex items-center justify-center py-10 text-ink-3">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
        </div>
      </ConsentCard>
    );
  }

  if (view.kind === 'expired') {
    return (
      <ConsentCard>
        <p className="text-[15px] leading-relaxed text-ink-2">
          This request has expired. Go back to the app you were connecting and try again.
        </p>
      </ConsentCard>
    );
  }

  if (view.kind === 'not_pro') {
    const { client } = view;
    return (
      <ConsentCard>
        <ClientMark client={client} />
        <h1 className="mt-5 font-display text-[26px] leading-tight text-ink">AI connections are part of Pro</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Upgrade to connect {client.name} and other AI apps to your Focalyst account.
        </p>
        {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleCancel} disabled={working}>
            Cancel
          </Button>
          {!IS_MOBILE_BUILD && (
            <Button variant="primary" onClick={() => router.push('/pricing')} disabled={working}>
              See Pro plans
            </Button>
          )}
        </div>
      </ConsentCard>
    );
  }

  const { client, host, credits } = view;
  const monthly = credits?.monthly_credits ?? 2000;

  return (
    <ConsentCard>
      <ClientMark client={client} />
      <h1 className="mt-5 font-display text-[26px] leading-tight text-ink">Connect {client.name} to Focalyst</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        {client.name} wants to use your Focalyst account. You&apos;ll return to{' '}
        <span className="font-medium text-ink">{host}</span> afterwards.
      </p>

      {isLoopback(host) && (
        <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-line bg-surface-2 p-3 text-[13px] leading-snug text-ink-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>This app runs on your own computer. Only allow it if you started this connection yourself.</span>
        </div>
      )}

      <div className="mt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">It will be able to</p>
        <ul className="mt-3 space-y-2.5">
          <Row icon={<Eye className="h-4 w-4 text-primary-text" />}>
            See your tasks, habits, focus sessions and countdowns
          </Row>
          <Row icon={<Eye className="h-4 w-4 text-primary-text" />}>
            Read your notes, voice note transcripts and summaries
          </Row>
          {allowWrites && (
            <Row icon={<Plus className="h-4 w-4 text-primary-text" />}>
              Add tasks, habits and countdowns, complete tasks and mark habits done
            </Row>
          )}
        </ul>
      </div>

      <div className="mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">It won&apos;t be able to</p>
        <ul className="mt-3 space-y-2.5">
          <Row icon={<ShieldOff className="h-4 w-4 text-ink-3" />}>Delete or edit anything you&apos;ve already made</Row>
          <Row icon={<ShieldOff className="h-4 w-4 text-ink-3" />}>See your payments or your Focalyst AI chats</Row>
        </ul>
      </div>

      <div className="mt-6 flex items-start justify-between gap-4 rounded-[16px] border border-line bg-surface-2/60 p-4">
        <div>
          <p className="text-[14px] font-medium text-ink">Allow changes</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-3">
            Let {client.name} add items and mark things done. You can change this later.
          </p>
        </div>
        <Switch checked={allowWrites} onChange={setAllowWrites} disabled={working} aria-label="Allow changes" />
      </div>

      <p className="mt-4 text-[13px] leading-snug text-ink-2">
        {credits?.has_account && typeof credits.balance === 'number'
          ? `Each request uses MCP credits. You have ${fmt(credits.balance)} of ${fmt(monthly)} left.`
          : `Each request uses MCP credits. You'll start with ${fmt(monthly)}.`}
      </p>

      {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={handleCancel} disabled={working}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => handleAllow(client)} loading={working} disabled={working}>
          Allow
        </Button>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-3">
        What you share goes to {client.name}, and its privacy policy applies. You can disconnect at any time in
        Settings → AI connections.
      </p>
    </ConsentCard>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <ConsentCard>
          <div className="flex items-center justify-center py-10 text-ink-3">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
          </div>
        </ConsentCard>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
