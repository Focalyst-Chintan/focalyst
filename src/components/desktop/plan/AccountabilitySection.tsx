'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Crown, Flame, Copy, MoreHorizontal, UserPlus, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import {
  fetchMyGroupLeaderboard,
  formOrUpdateHabitGroup,
  joinHabitGroupByCode,
  leaveCurrentHabitGroup,
  GroupLeaderboardData,
} from '@/lib/services/habitGroupService';
import { Button, IconButton, Input, Modal, SegmentedControl, Toast } from '@/components/desktop/ui';
import { MemberAvatar } from '@/components/desktop/ui/MemberAvatar';
import { useData } from '@/lib/data/useData';

type Row = { userId: string; name: string; habit: string; streak: number; isYou: boolean };
type Ranked = Row & { habits: string[] };

function rankMembers(rows: Row[]): Ranked[] {
  const byUser = new Map<string, Ranked>();
  for (const r of rows) {
    const cur = byUser.get(r.userId);
    if (!cur) byUser.set(r.userId, { ...r, habits: [r.habit] });
    else {
      if (!cur.habits.includes(r.habit)) cur.habits.push(r.habit);
      cur.streak = Math.max(cur.streak, r.streak);
    }
  }
  return [...byUser.values()].sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
}

const PODIUM = [
  { place: 2, idx: 1, block: 'h-20', avatar: 'size-11 text-sm' },
  { place: 1, idx: 0, block: 'h-28', avatar: 'size-14 text-base' },
  { place: 3, idx: 2, block: 'h-14', avatar: 'size-11 text-sm' },
] as const;

export function AccountabilitySection() {
  const { user } = useAuth();
  const { habits } = usePlan();
  const supabase = createClient();

  const [leaderboardData, setLeaderboardData] = useState<GroupLeaderboardData>({
    in_group: false,
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');

  // Modals & form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Set default habit
  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  // Load active group leaderboard via useData
  const leaderboardFetcher = useCallback(async (): Promise<GroupLeaderboardData> => {
    const data = await fetchMyGroupLeaderboard();
    return data || { in_group: false, members: [] };
  }, []);

  const accountabilityKey = user ? `accountability:${user.id}` : null;
  const { data: cachedLeaderboard, isLoading: leaderboardLoading, mutate: mutateLeaderboard } = useData<GroupLeaderboardData>(
    accountabilityKey,
    leaderboardFetcher
  );

  useEffect(() => {
    if (cachedLeaderboard) {
      setLeaderboardData(cachedLeaderboard);
      if (cachedLeaderboard.in_group && cachedLeaderboard.group_id) {
        setActiveGroupId(cachedLeaderboard.group_id);
        setAllGroups([{ id: cachedLeaderboard.group_id, name: 'Habit Group' }]);
      } else {
        setAllGroups([]);
      }
    }
    setLoading(leaderboardLoading);
  }, [cachedLeaderboard, leaderboardLoading]);

  const loadGroup = useCallback(async () => {
    await mutateLeaderboard();
  }, [mutateLeaderboard]);

  useEffect(() => {
    const unsub = onDataChanged(['habit'], () => {
      loadGroup();
    });
    return () => unsub();
  }, [loadGroup]);

  // Safe realtime subscription per mount
  const groupId = leaderboardData.group_id;
  useEffect(() => {
    if (!groupId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`group-members-${groupId}-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'habit_group_members',
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            loadGroup();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime unavailable, using refetch on focus', e);
    }

    const onFocus = () => loadGroup();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, supabase, loadGroup]);

  // Check hash on mount and scroll to #accountability
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#accountability') {
      const el = document.getElementById('accountability');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  // Deduplicate and rank members using rankMembers
  const rankedMembers = useMemo(() => {
    const rawRows: Row[] = (leaderboardData.members || []).map((m) => {
      const isYou = m.user_id === user?.id || m.is_me;
      const cleanName = (m.display_name || '').replace(/\s*\(you\)/i, '').trim();
      return {
        userId: m.user_id,
        name: cleanName || (isYou ? 'You' : 'Member'),
        habit: m.habit_name || 'Active Habit',
        streak: Number(m.streak || 0),
        isYou,
      };
    });

    return rankMembers(rawRows);
  }, [leaderboardData.members, user?.id]);

  // Standings list: top 50, always including current user's row
  const standingsRows = useMemo(() => {
    const top50 = rankedMembers.slice(0, 50);
    const userRow = rankedMembers.find((m) => m.isYou);
    if (userRow && !top50.some((m) => m.userId === userRow.userId)) {
      return [...top50, userRow];
    }
    return top50;
  }, [rankedMembers]);

  // Copy invite code
  const handleCopyCode = async () => {
    const code = leaderboardData.invite_code || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setToastMessage('Copied');
    } catch {}
  };

  // Share invite
  const handleShareInvite = async () => {
    const code = leaderboardData.invite_code || '';
    const shareText = `Join my Focalyst group with code ${code} at https://focalyst.online`;
    try {
      await navigator.clipboard.writeText(shareText);
      setToastMessage('Copied');
    } catch {}
    setMenuOpen(false);
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!selectedHabitId) {
      setActionError('Please select a habit.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await formOrUpdateHabitGroup(selectedHabitId);
      emitDataChanged('habit');
      await loadGroup();
      setIsCreateModalOpen(false);
      setToastMessage('Group created');
    } catch (err: any) {
      setActionError(err?.message || 'Could not create group.');
    } finally {
      setActionLoading(false);
    }
  };

  // Join group
  const handleJoinGroup = async () => {
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean.length < 6) {
      setActionError('Enter 6-character code.');
      return;
    }
    if (!selectedHabitId) {
      setActionError('Please select a habit to track.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await joinHabitGroupByCode(clean, selectedHabitId);
      if (res.success) {
        emitDataChanged('habit');
        await loadGroup();
        setIsJoinModalOpen(false);
        setJoinCodeInput('');
        setToastMessage('Joined group');
      } else {
        setActionError(res.message);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to join group.');
    } finally {
      setActionLoading(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      await leaveCurrentHabitGroup();
      emitDataChanged('habit');
      await loadGroup();
      setIsLeaveModalOpen(false);
      setToastMessage('Left group');
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const activeGroupName = allGroups.find((g) => g.id === activeGroupId)?.name || 'Habit Group';
  const memberCount = rankedMembers.length;
  const inviteCode = leaderboardData.invite_code || '------';

  return (
    <section id="accountability" className="mt-10 scroll-mt-24">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline">
          <h2 className="font-display text-[28px] leading-[34px] text-[var(--ink)]">Accountability</h2>
          <span className="text-[13px] text-[var(--ink-3)] ml-3">Stay consistent together.</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActionError('');
              setIsJoinModalOpen(true);
            }}
            className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)] transition-colors hover:opacity-90 select-none cursor-pointer"
          >
            Join with code
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)] transition-colors hover:opacity-90 select-none cursor-pointer"
          >
            Create group
          </button>
        </div>
      </div>

      {/* Main Content: Empty State vs Active Group Card */}
      {!leaderboardData.in_group || rankedMembers.length === 0 ? (
        <div className="frost rounded-[24px] p-8 text-center">
          <h3 className="font-display text-[28px] leading-[34px] text-[var(--ink)]">Stay accountable together.</h3>
          <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-[24px] text-[var(--ink-2)]">
            Create a group or join one with a 6 character code. Members only see your name, your chosen habit and your streak.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActionError('');
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)] transition-colors hover:opacity-90 select-none cursor-pointer"
            >
              Create group
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError('');
                setIsJoinModalOpen(true);
              }}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)] transition-colors hover:opacity-90 select-none cursor-pointer"
            >
              Join with code
            </button>
          </div>
        </div>
      ) : (
        <div className="frost rounded-[24px] p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 items-start">
          {/* Left Column: Group Header + Podium + Invite Code Bar */}
          <div className="flex min-w-0 flex-col">
            {/* Top of left column: group name, member count, optional switcher */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-baseline gap-2 truncate">
                <span className="font-display text-[20px] text-[var(--ink)] truncate">{activeGroupName}</span>
                <span className="text-[13px] text-[var(--ink-3)] shrink-0">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
              {allGroups.length > 1 && (
                <div className="shrink-0">
                  {allGroups.length <= 3 ? (
                    <SegmentedControl
                      options={allGroups.map((g) => ({ value: g.id, label: g.name }))}
                      value={activeGroupId}
                      onChange={(val) => setActiveGroupId(val)}
                      size="sm"
                    />
                  ) : (
                    <select
                      value={activeGroupId}
                      onChange={(e) => setActiveGroupId(e.target.value)}
                      aria-label="Active group"
                      className="h-8 px-2.5 rounded-[10px] bg-[var(--surface-2)] border border-[var(--line)] text-[13px] text-[var(--ink)] outline-none"
                    >
                      {allGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Podium */}
            <div>
              <div className="grid grid-cols-3 items-end gap-3">
                {PODIUM.map(({ place, idx, block, avatar }) => {
                  const m = rankedMembers[idx];
                  return (
                    <div key={place} className="flex min-w-0 flex-col items-center">
                      {m ? (
                        <>
                          <MemberAvatar
                            member={m}
                            className={`${avatar} ${m.isYou ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                          />
                          <p className="mt-2 max-w-full truncate text-sm font-medium text-[var(--ink)]">{m.isYou ? 'You' : m.name}</p>
                          <p className="mb-2 flex items-center gap-1 text-xs text-[var(--ink-3)]">
                            <span className={m.streak === 0 ? 'grayscale opacity-40' : ''} aria-hidden>🔥</span>
                            {m.streak}d
                          </p>
                        </>
                      ) : (
                        <>
                          <div className={`${avatar} grid place-items-center rounded-full border border-dashed border-[var(--line)] text-[var(--ink-3)]`}>
                            <Plus className="size-4" aria-hidden />
                          </div>
                          <p className="mt-2 text-xs text-[var(--ink-3)]">Invite a friend</p>
                          <p className="invisible mb-2 text-xs">0d</p>
                        </>
                      )}
                      <div
                        className={`${block} grid w-full place-items-center rounded-t-2xl border border-b-0 font-display text-2xl ${
                          place === 1
                            ? 'border-transparent bg-[linear-gradient(180deg,#1951FC,#0B2CB1)] text-snow shadow-[0_8px_24px_-8px_rgba(25,81,252,0.6)]'
                            : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)]'
                        }`}
                      >
                        {place}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-px w-full bg-[var(--line)]" />
            </div>

            {/* Invite code row (under the podium, mt-5) */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-3)]">Invite code</p>
                <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5">
                  <span className="font-mono text-sm tracking-[0.2em] text-[var(--ink)]">{inviteCode}</span>
                  <IconButton
                    label="Copy invite code"
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCode}
                    className="h-6 w-6"
                  >
                    <Copy size={13} />
                  </IconButton>
                </div>
              </div>

              <div className="relative">
                <IconButton
                  label="Group options"
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-8 w-8"
                >
                  <MoreHorizontal size={15} />
                </IconButton>
                {menuOpen && (
                  <div
                    className="glass-strong liquid absolute right-0 bottom-full mb-1.5 w-44 rounded-[14px] p-1 shadow-lg z-30"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={handleShareInvite}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[10px] text-[13px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors text-left"
                    >
                      <UserPlus size={14} className="text-[var(--ink-3)]" />
                      <span>Share invite</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsLeaveModalOpen(true);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[10px] text-[13px] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors text-left"
                    >
                      <LogOut size={14} />
                      <span>Leave group</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Standings */}
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-3)] mb-2">
              STANDINGS
            </div>

            <div className="space-y-1">
              {standingsRows.map((member) => {
                const rankIndex = rankedMembers.findIndex((m) => m.userId === member.userId);
                const rankNum = rankIndex >= 0 ? rankIndex + 1 : 1;
                const rankColorClass = rankNum <= 3 ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-3)]';

                return (
                  <div
                    key={member.userId}
                    className={`h-12 px-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-[var(--surface-2)] ${
                      member.isYou ? 'bg-[var(--primary-soft)]' : ''
                    }`}
                  >
                    <span className={`w-7 text-[13px] tabular-nums ${rankColorClass}`}>
                      #{rankNum}
                    </span>
                    <MemberAvatar
                      member={member}
                      className="size-8"
                    />
                    <div className="min-w-0 flex items-center gap-2 flex-1">
                      <span className="truncate text-[13px] font-medium text-[var(--ink)]">
                        {member.name}
                      </span>
                      {member.isYou && (
                        <span className="shrink-0 rounded-md bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary-text)]">
                          You
                        </span>
                      )}
                      <span className="truncate text-xs text-[var(--ink-3)]">
                        {member.habits.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <span className={member.streak === 0 ? 'grayscale opacity-40' : ''} aria-hidden>
                        🔥
                      </span>
                      <span
                        className={`text-[13px] tabular-nums font-medium ${
                          member.streak === 0 ? 'text-[var(--ink-3)]' : 'text-[var(--ink-2)]'
                        }`}
                      >
                        {member.streak}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="sm"
        title="Create group"
        subtitle="Start a shared streak with friends. Choose a habit to track."
      >
        <div className="py-2 space-y-4">
          <div>
            <label className="text-[13px] font-medium text-ink-2 mb-1.5 block">
              Habit to track
            </label>
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[14px] bg-surface-2 border border-line text-ink text-[14px] outline-none focus:border-primary"
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon || '🎯'} {h.name} ({h.current_streak || 0}d streak)
                </option>
              ))}
            </select>
          </div>
          {actionError && <p className="text-[12px] text-danger">{actionError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={actionLoading || !selectedHabitId}
              onClick={handleCreateGroup}
            >
              {actionLoading ? 'Creating...' : 'Create group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        size="sm"
        title="Join with code"
        subtitle="Enter the 6 character invite code from your teammate."
      >
        <div className="py-2 space-y-4">
          <Input
            label="Invite code"
            placeholder="e.g. ABC123"
            maxLength={6}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            className="font-mono tracking-[0.15em] uppercase text-[16px]"
          />
          <div>
            <label className="text-[13px] font-medium text-ink-2 mb-1.5 block">
              Select your habit to track
            </label>
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[14px] bg-surface-2 border border-line text-ink text-[14px] outline-none focus:border-primary"
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon || '🎯'} {h.name} ({h.current_streak || 0}d streak)
                </option>
              ))}
            </select>
          </div>
          {actionError && <p className="text-[12px] text-danger">{actionError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={actionLoading || joinCodeInput.trim().length < 6 || !selectedHabitId}
              onClick={handleJoinGroup}
            >
              {actionLoading ? 'Joining...' : 'Join group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        size="sm"
        title="Leave group?"
        confirmLabel="Leave"
        onConfirm={handleLeaveGroup}
      >
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Are you sure you want to leave this accountability group? You can rejoin anytime with the invite code.
        </p>
      </Modal>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast
            id="accountability-toast"
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        </div>
      )}
    </section>
  );
}

export default AccountabilitySection;
