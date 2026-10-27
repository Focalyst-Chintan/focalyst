'use client';
import React, { useState } from 'react';
import { Plug } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/desktop/ui/Button';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import { Modal } from '@/components/desktop/ui/Modal';
import { Switch } from '@/components/desktop/ui/Switch';
import { useToast } from '@/components/desktop/ui/Toast';
import type { McpConnectedApp } from '@/hooks/mcp/useMcp';
import { fmtNum, shortDate, timeAgo } from './format';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

function AppRow({ app, onChanged }: { app: McpConnectedApp; onChanged: () => void }) {
  const toast = useToast();
  const [allow, setAllow] = useState(app.allowWrites);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const toggle = async (next: boolean) => {
    setAllow(next);
    const { error } = await createClient().rpc('mcp_set_allow_writes', { p_client_id: app.clientId, p_allow: next });
    if (error) {
      setAllow(!next);
      toast.show(GENERIC_ERROR, 'error');
      return;
    }
    onChanged();
  };

  const disconnect = async () => {
    setWorking(true);
    const supabase = createClient();
    const { error } = await supabase.auth.oauth.revokeGrant({ clientId: app.clientId });
    if (error) {
      setWorking(false);
      toast.show(GENERIC_ERROR, 'error');
      return;
    }
    await supabase.rpc('mcp_mark_revoked', { p_client_id: app.clientId });
    setWorking(false);
    setConfirming(false);
    toast.show(`${app.name} disconnected`, 'success');
    onChanged();
  };

  const meta = [
    `Connected ${shortDate(app.connectedAt)}`,
    app.lastUsedAt ? `Last used ${timeAgo(app.lastUsedAt)}` : null,
    `${fmtNum(app.calls)} request${app.calls === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[16px] bg-surface-2/60 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft font-display text-[18px] text-primary-text">
        {(app.name.trim()[0] || '?').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{app.name}</p>
        <p className="mt-0.5 text-[12px] text-ink-3">{meta}</p>
      </div>
      <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
        <span>Can make changes</span>
        <Switch checked={allow} onChange={toggle} aria-label={`${app.name} can make changes`} />
      </label>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        Disconnect
      </Button>

      <Modal
        isOpen={confirming}
        onClose={() => !working && setConfirming(false)}
        title={`Disconnect ${app.name}?`}
        size="sm"
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          {app.name} will lose access to your Focalyst data straight away. You can connect it again at any time.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={working}>
            Cancel
          </Button>
          <Button variant="danger" onClick={disconnect} loading={working} disabled={working}>
            Disconnect
          </Button>
        </div>
      </Modal>
    </li>
  );
}

export function ConnectedApps({ apps, onChanged }: { apps: McpConnectedApp[]; onChanged: () => void }) {
  return (
    <div className="frost rounded-[24px] p-6">
      <h3 className="text-[15px] font-semibold text-ink">Connected apps</h3>
      {apps.length === 0 ? (
        <EmptyState
          className="mt-2"
          icon={<Plug className="h-6 w-6" />}
          title="No connected apps yet"
          description="Add Focalyst in Claude, ChatGPT or Gemini and sign in. It will show up here."
        />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {apps.map((a) => (
            <AppRow key={a.clientId} app={a} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}
