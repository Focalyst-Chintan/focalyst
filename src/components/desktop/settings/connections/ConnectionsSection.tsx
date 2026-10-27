'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';
import { CopyField } from '@/components/desktop/ui/CopyField';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { useMcpActivity, useMcpConnections, useMcpCredits, useMcpPrices } from '@/hooks/mcp/useMcp';
import { ConnectedApps } from './ConnectedApps';
import { CreditsCard } from './CreditsCard';
import { RecentActivity } from './RecentActivity';
import { SetupGuide } from './SetupGuide';
import { IS_MOBILE_BUILD, MCP_URL } from './format';

const PAGE = 20;
const MAX_ROWS = 200;

function ProCard() {
  const router = useRouter();
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] p-7 text-snow">
      <div className="ambient-grain pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative z-10">
        <Sparkles className="h-5 w-5 text-snow" />
        <h3 className="mt-3 font-display text-[24px] leading-tight text-snow">AI connections are part of Pro</h3>
        <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-snow/80">
          Connect Focalyst to Claude, ChatGPT and Gemini, with 2,000 MCP credits every month and 10 more each day you
          open Focalyst.
        </p>
        {!IS_MOBILE_BUILD && (
          <Button variant="onDark" className="mt-5" onClick={() => router.push('/pricing')}>
            See Pro plans
          </Button>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-[112px] rounded-[24px]" />
      <Skeleton className="h-[164px] rounded-[24px]" />
      <Skeleton className="h-[360px] rounded-[24px]" />
    </div>
  );
}

export default function ConnectionsSection() {
  const [limit, setLimit] = useState(PAGE);
  const credits = useMcpCredits();
  const prices = useMcpPrices();
  const connections = useMcpConnections();
  const activity = useMcpActivity(limit);

  const labels = useMemo(
    () => Object.fromEntries((prices.data ?? []).map((p) => [p.tool, p.label])) as Record<string, string>,
    [prices.data]
  );

  const header = (
    <div className="frost rounded-[24px] p-7">
      <h2 className="font-display text-[24px] leading-tight text-ink">Connect Focalyst to your AI</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">
        Use your tasks, habits, focus sessions, countdowns and notes inside Claude, ChatGPT and Gemini.
      </p>
    </div>
  );

  if (credits.isLoading && !credits.data) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState />
      </div>
    );
  }

  if (!credits.data?.is_pro) {
    return (
      <div className="space-y-6">
        {header}
        <ProCard />
        <div aria-label="Setup guide preview">
          <SetupGuide />
        </div>
      </div>
    );
  }

  const refresh = () => {
    connections.mutate();
    credits.mutate();
  };

  const rows = activity.data ?? [];

  return (
    <div className="space-y-6">
      {header}

      <div className="frost rounded-[24px] p-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Your connector URL</p>
        <CopyField value={MCP_URL} label="Copy connector URL" className="mt-2" />
        <p className="mt-2 text-[13px] text-ink-3">Paste this into your AI app when it asks for a server URL.</p>
      </div>

      <CreditsCard credits={credits.data} prices={prices.data ?? []} />

      <SetupGuide />

      {connections.isLoading && !connections.data ? (
        <Skeleton className="h-[140px] rounded-[24px]" />
      ) : (
        <ConnectedApps apps={connections.data?.apps ?? []} onChanged={refresh} />
      )}

      {activity.isLoading && !activity.data ? (
        <Skeleton className="h-[200px] rounded-[24px]" />
      ) : (
        <RecentActivity
          rows={rows}
          labels={labels}
          appNames={connections.data?.names ?? {}}
          canShowMore={rows.length >= limit && limit < MAX_ROWS}
          loadingMore={activity.isValidating}
          onShowMore={() => setLimit((l) => Math.min(MAX_ROWS, l + PAGE))}
        />
      )}
    </div>
  );
}
