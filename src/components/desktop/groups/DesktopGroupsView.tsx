'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { emitDataChanged, onDataChanged } from '@/lib/events';
import {
  fetchMyGroupLeaderboard,
  formOrUpdateHabitGroup,
  joinHabitGroupByCode,
  leaveCurrentHabitGroup,
  GroupLeaderboardData,
  GroupLeaderboardMember,
} from '@/lib/services/habitGroupService';

// Desktop UI
import { Button } from '@/components/desktop/ui/Button';
import { Input } from '@/components/desktop/ui/Input';
import { Avatar } from '@/components/desktop/ui/Avatar';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import { Toast, ToastContainer } from '@/components/desktop/ui/Toast';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import {
  Users,
  Plus,
  KeyRound,
  Copy,
  MoreHorizontal,
  Share2,
  LogOut,
  Crown,
  Sparkles,
  Flame,
  Check,
} from 'lucide-react';

export default function DesktopGroupsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { habits } = usePlan();
  const supabase = createClient();

  const [leaderboardData, setLeaderboardData] = useState<GroupLeaderboardData>({
    in_group: false,
    members: [],
  });
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Set default habit selection
  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  // Load group leaderboard
  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMyGroupLeaderboard();
      setLeaderboardData(data || { in_group: false, members: [] });
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroup();

    // Listen to custom habit updates
    const unsub = onDataChanged(['habit'], loadGroup);

    const groupId = leaderboardData.group_id;
    if (!groupId) {
      return () => {
        unsub();
      };
    }

    // Subscribe to real-time habit_group_members channel safely
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `group-members-${groupId}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(channelName)
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
      unsub();
      window.removeEventListener('focus', onFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadGroup, supabase, leaderboardData.group_id]);

  // Enrich and deduplicate members by user_id
  const deduplicatedMembers = useMemo(() => {
    const map = new Map<string, GroupLeaderboardMember>();
    (leaderboardData.members || []).forEach((m) => {
      const existing = map.get(m.user_id);
      if (!existing) {
        map.set(m.user_id, m);
      } else {
        // keep member with higher streak or total days
        if (m.streak > existing.streak || (m.streak === existing.streak && m.total_days > existing.total_days)) {
          map.set(m.user_id, m);
        }
      }
    });

    const list = Array.from(map.values()).map((m) => {
      const cleanName = (m.display_name || '').replace(/\s*\(you\)/i, '').trim();
      if (m.is_me) {
        const localHabit = habits.find((h) => h.id === m.habit_id) || habits[0];
        return {
          ...m,
          display_name: cleanName || 'You',
          streak: Math.max(m.streak, localHabit?.current_streak || 0),
          total_days: Math.max(m.total_days, (localHabit as any)?.completedDates?.length || 0),
          habit_name:
            m.habit_name && m.habit_name !== 'Active Habit'
              ? m.habit_name
              : localHabit?.name || 'Active Habit',
        };
      }
      return {
        ...m,
        display_name: cleanName || 'Member',
      };
    });

    // Sort descending by streak, then total days
    list.sort((a, b) => b.streak - a.streak || b.total_days - a.total_days);
    return list;
  }, [leaderboardData.members, habits]);

  // Order top 3 podium as [2nd, 1st, 3rd]
  const podiumMembers = useMemo(() => {
    if (deduplicatedMembers.length === 0) return [];
    if (deduplicatedMembers.length === 1) {
      return [{ member: deduplicatedMembers[0], rank: 1 }];
    }
    if (deduplicatedMembers.length === 2) {
      return [
        { member: deduplicatedMembers[1], rank: 2 },
        { member: deduplicatedMembers[0], rank: 1 },
      ];
    }
    return [
      { member: deduplicatedMembers[1], rank: 2 },
      { member: deduplicatedMembers[0], rank: 1 },
      { member: deduplicatedMembers[2], rank: 3 },
    ];
  }, [deduplicatedMembers]);

  // Handle Copy Invite Code
  const handleCopyCode = async () => {
    const code = leaderboardData.invite_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setToastMessage('Code copied');
    } catch {}
  };

  // Handle Share Invite Link
  const handleShareInvite = async () => {
    const code = leaderboardData.invite_code || '';
    const shareText = `Join my Focalyst group with code ${code} at https://focalyst.online`;
    try {
      await navigator.clipboard.writeText(shareText);
      setToastMessage('Invite link copied');
    } catch {}
  };

  // Create Group
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

  // Join Group
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

  // Leave Group
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

  if (loading && !leaderboardData.in_group && leaderboardData.members.length === 0) {
    return (
      <div className="grid grid-cols-[320px_1fr] gap-5 items-start max-w-[1280px] mx-auto">
        <div className="frost rounded-[20px] p-4 space-y-3">
          <Skeleton className="h-9 w-full rounded-[10px]" />
          <Skeleton className="h-20 w-full rounded-[16px]" />
        </div>
        <div className="frost rounded-[28px] p-7 space-y-6">
          <Skeleton className="h-10 w-64 rounded-[12px]" />
          <Skeleton className="h-44 w-full rounded-[20px]" />
        </div>
      </div>
    );
  }

  // EMPTY STATE: User is not in any group
  if (!leaderboardData.in_group || deduplicatedMembers.length === 0) {
    return (
      <div className="frost rounded-[28px] p-12 max-w-[560px] mx-auto my-12 text-center shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary-text flex items-center justify-center mx-auto mb-5">
          <Users size={32} />
        </div>
        <h1 className="font-display text-[36px] leading-[42px] text-ink">
          Stay accountable together.
        </h1>
        <p className="text-[15px] text-ink-2 mt-2 max-w-sm mx-auto">
          Create a group or join one with a code.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>Create group</span>
          </Button>
          <Button variant="secondary" size="md" onClick={() => setIsJoinModalOpen(true)}>
            <KeyRound size={16} />
            <span>Join with code</span>
          </Button>
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          size="sm"
          title="Create habit group"
          subtitle="Form a tight accountability pod with up to 5 members."
        >
          <div className="py-2 space-y-4">
            <div>
              <label className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Select habit to share
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
          subtitle="Enter the 6-character invite code from your teammate."
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
      </div>
    );
  }

  // ACTIVE GROUP LAYOUT: 2-Column
  const myIndex = deduplicatedMembers.findIndex((m) => m.is_me);
  const myRank = myIndex >= 0 ? myIndex + 1 : 1;

  return (
    <div className="grid grid-cols-[320px_1fr] gap-5 items-start max-w-[1280px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <ToastContainer>
          <Toast
            id="group-toast"
            message={toastMessage}
            type="success"
            onDismiss={() => setToastMessage(null)}
          />
        </ToastContainer>
      )}

      {/* LEFT COLUMN: Actions & Group Cards (320px) */}
      <div className="space-y-3">
        {/* Top Action Row */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 justify-center"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={14} />
            <span>Create group</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center"
            onClick={() => setIsJoinModalOpen(true)}
          >
            <KeyRound size={14} />
            <span>Join with code</span>
          </Button>
        </div>

        {/* Current Active Group Card */}
        <div className="frost rounded-[20px] p-4 cursor-pointer transition border border-primary/40 bg-surface shadow-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink truncate">
              Habit Accountability
            </h3>
            <span className="bg-primary-soft text-primary-text px-2.5 py-0.5 rounded-full text-[12px] font-medium tabular-nums">
              #{myRank}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] text-ink-3 tabular-nums">
              {deduplicatedMembers.length} {deduplicatedMembers.length === 1 ? 'member' : 'members'}
            </span>
            <div className="flex items-center">
              {deduplicatedMembers.slice(0, 4).map((m, i) => (
                <div
                  key={m.user_id}
                  className={`relative ${i > 0 ? '-ml-2' : ''} ring-2 ring-[var(--surface)] rounded-full`}
                >
                  <Avatar name={m.display_name} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT DETAIL PANEL (1fr) */}
      <div className="frost rounded-[28px] p-7">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-line">
          <div className="flex items-baseline">
            <h2 className="font-display text-[32px] leading-[38px] text-ink">
              Habit Accountability
            </h2>
            <span className="text-[13px] text-ink-3 tabular-nums ml-3">
              {deduplicatedMembers.length} {deduplicatedMembers.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Invite Code Chip */}
            <div className="bg-surface-2 rounded-[10px] px-2.5 h-8 flex items-center gap-2 font-mono text-[13px] tracking-[0.12em] text-ink border border-line">
              <span>{leaderboardData.invite_code || '------'}</span>
              <IconButton
                label="Copy invite code"
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
              >
                <Copy size={13} className="text-ink-3 hover:text-ink" />
              </IconButton>
            </div>

            {/* Menu: Share invite & Leave group */}
            <Popover
              align="end"
              trigger={
                <IconButton label="Group settings" size="sm" variant="ghost">
                  <MoreHorizontal size={16} className="text-ink-2" />
                </IconButton>
              }
            >
              {({ close }) => (
                <div className="p-1.5 w-44 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      handleShareInvite();
                    }}
                    className="h-8 px-2.5 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left font-medium"
                  >
                    <Share2 size={14} className="text-ink-2" />
                    <span>Share invite</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setIsLeaveModalOpen(true);
                    }}
                    className="h-8 px-2.5 rounded-[8px] flex items-center gap-2 text-[13px] text-danger hover:bg-danger/10 transition-colors text-left font-medium"
                  >
                    <LogOut size={14} />
                    <span>Leave group</span>
                  </button>
                </div>
              )}
            </Popover>
          </div>
        </div>

        {/* Podium: Top 3 members [2nd, 1st, 3rd] */}
        <div className="mt-8 flex items-end justify-center gap-4 max-w-[560px] mx-auto">
          {podiumMembers.map(({ member, rank }) => {
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            const isThird = rank === 3;

            return (
              <div
                key={member.user_id}
                className="flex-1 max-w-[172px] flex flex-col items-center"
              >
                <Avatar name={member.display_name} size="lg" className="w-14 h-14 text-[18px]" />
                <div className="text-[14px] font-semibold text-ink truncate max-w-full mt-2">
                  {member.display_name} {member.is_me ? '(You)' : ''}
                </div>
                <div className="text-[13px] text-ink-2 tabular-nums">
                  {member.streak}d streak
                </div>

                {/* Pedestal block */}
                <div
                  className={`mt-3 w-full rounded-t-[16px] flex flex-col items-center justify-center transition-all ${
                    isFirst
                      ? 'h-[160px] bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] text-snow relative overflow-hidden shadow-lg'
                      : isSecond
                      ? 'h-[120px] frost text-ink'
                      : 'h-[100px] frost text-ink'
                  }`}
                >
                  {isFirst && (
                    <>
                      <div className="ambient-grain" />
                      <Crown size={18} className="text-amber-300 mb-1 z-10" />
                    </>
                  )}
                  <span
                    className={`font-display z-10 ${
                      isFirst ? 'text-[32px]' : isSecond ? 'text-[28px]' : 'text-[26px]'
                    }`}
                  >
                    #{rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Standings Table */}
        <div className="mt-10">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 mb-2">
            STANDINGS
          </div>
          <div className="space-y-1">
            {deduplicatedMembers.map((m, index) => {
              const rank = index + 1;
              const isCurrentUser = m.is_me;
              return (
                <div
                  key={m.user_id}
                  className={`h-[52px] px-3.5 rounded-[14px] flex items-center gap-3 transition-colors ${
                    isCurrentUser
                      ? 'bg-primary-soft text-primary-text'
                      : 'hover:bg-surface-2/60 text-ink'
                  }`}
                >
                  <span className="w-8 text-[13px] tabular-nums text-ink-3 font-semibold">
                    #{rank}
                  </span>
                  <Avatar name={m.display_name} size="sm" />
                  <div className="flex-1 truncate">
                    <span
                      className={`text-[14px] truncate ${
                        isCurrentUser ? 'font-semibold text-primary-text' : 'font-medium text-ink'
                      }`}
                    >
                      {m.display_name} {isCurrentUser ? '(You)' : ''}
                    </span>
                    <span className="text-[12px] text-ink-3 ml-2 truncate">
                      · {m.habit_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] tabular-nums text-ink-2 font-medium shrink-0">
                    <Flame size={14} className="fill-accent text-accent" />
                    <span>{m.streak}d streak</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="sm"
        title="Create group"
        subtitle="Form a new accountability group."
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
              {actionLoading ? 'Creating...' : 'Create'}
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
      >
        <div className="py-2 space-y-4">
          <Input
            label="6-character invite code"
            placeholder="ABC123"
            maxLength={6}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            className="font-mono tracking-[0.15em] uppercase text-[16px]"
          />
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
            <Button variant="secondary" onClick={() => setIsJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={actionLoading || joinCodeInput.trim().length < 6 || !selectedHabitId}
              onClick={handleJoinGroup}
            >
              {actionLoading ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Confirmation Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        size="sm"
        title="Leave group?"
        subtitle="You will be removed from the leaderboard."
      >
        <div className="py-2">
          <p className="text-[14px] text-ink-2">
            Are you sure you want to leave this accountability group? You can always rejoin using the invite code later.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={actionLoading}
              onClick={handleLeaveGroup}
            >
              {actionLoading ? 'Leaving...' : 'Leave group'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
