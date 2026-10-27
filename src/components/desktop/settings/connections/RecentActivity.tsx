'use client';
import React from 'react';
import { Button } from '@/components/desktop/ui/Button';
import { Chip } from '@/components/desktop/ui/Chip';
import type { McpLedgerRow } from '@/hooks/mcp/useMcp';
import { signed, timeAgo } from './format';

const PENDING_GRACE_MS = 2 * 60_000;

function actionLabel(row: McpLedgerRow, labels: Record<string, string>) {
  if (row.kind === 'bonus') return 'Daily bonus';
  if (row.kind === 'reset') return 'Monthly refill';
  if (row.kind === 'adjustment') return 'Credit adjustment';
  return (row.tool && labels[row.tool]) || row.tool || 'Request';
}

function effectiveStatus(row: McpLedgerRow): 'success' | 'refunded' | 'pending' {
  if (row.status === 'pending' && Date.now() - new Date(row.created_at).getTime() > PENDING_GRACE_MS) return 'success';
  return row.status;
}

export function RecentActivity({
  rows,
  labels,
  appNames,
  canShowMore,
  onShowMore,
  loadingMore,
}: {
  rows: McpLedgerRow[];
  labels: Record<string, string>;
  appNames: Record<string, string>;
  canShowMore: boolean;
  onShowMore: () => void;
  loadingMore: boolean;
}) {
  return (
    <div className="frost rounded-[24px] p-6">
      <h3 className="text-[15px] font-semibold text-ink">Recent activity</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">Nothing yet. Requests from your AI apps will appear here.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <th className="py-2 pr-3 font-semibold">Action</th>
                <th className="py-2 pr-3 font-semibold">App</th>
                <th className="py-2 pr-3 font-semibold">When</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Credits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = effectiveStatus(r);
                return (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-3 text-ink">{actionLabel(r, labels)}</td>
                    <td className="py-2.5 pr-3 text-ink-2">
                      {r.kind === 'tool' ? (r.client_id && appNames[r.client_id]) || 'Unknown app' : 'Focalyst'}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-3">{timeAgo(r.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      {status === 'refunded' ? (
                        <Chip variant="neutral">Refunded</Chip>
                      ) : status === 'pending' ? (
                        <Chip variant="neutral">In progress</Chip>
                      ) : (
                        <Chip variant="success">Done</Chip>
                      )}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${
                        status === 'refunded' ? 'text-ink-3 line-through' : r.delta > 0 ? 'text-primary-text' : 'text-ink'
                      }`}
                    >
                      {signed(r.delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {canShowMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={onShowMore} loading={loadingMore}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );
}
