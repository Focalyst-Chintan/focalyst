'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Crown, Flame, Copy, MoreHorizontal, UserPlus, LogOut, Check } from 'lucide-react';
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
  GroupLeaderboardMember,
} from '@/lib/services/habitGroupService';
import { Button, IconButton, Input, Modal, SegmentedControl, Toast } from '@/components/desktop/ui';
import { MemberAvatar } from '@/components/desktop/ui/MemberAvatar';

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

  const [showAllMembers, setShowAllMembers] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Set default habit
  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  // Load active group leaderboard
  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMyGroupLeaderboard();
      setLeaderboardData(data || { in_group: false, members: [] });
      if (data?.in_group && data?.group_id) {
        setActiveGroupId(data.group_id);
        setAllGroups([{ id: data.group_id, name: 'Habit Group' }]);
      } else {
        setAllGroups([]);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroup();
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

  // Deduplicate and rank members
  const deduplicatedMembers = useMemo(() => {
    const map = new Map<string, GroupLeaderboardMember>();
    (leaderboardData.members || []).forEach((m) => {
      const existing = map.get(m.user_id);
      if (!existing) {
        map.set(m.user_id, m);
      } else if (m.streak > existing.streak) {
        map.set(m.user_id, m);
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      return (a.name || '').localeCompare(b.name || '');
    });

    return list.map((m, idx) => ({
      ...m,
      rank: idx + 1,
      is_me: m.user_id === user?.id,
    }));
  }, [leaderboardData.members, user?.id]);

  // Podium order: [2nd, 1st, 3rd]
  const podiumMembers = useMemo(() => {
    if (deduplicatedMembers.length === 0) return [];
    const first = deduplicatedMembers[0];
    const second = deduplicatedMembers[1];
    const third = deduplicatedMembers[2];

    const res: Array<{ member: GroupLeaderboardMember; place: number }> = [];
    if (second) res.push({ member: second, place: 2 });
    if (first) res.push({ member: first, place: 1 });
    if (third) res.push({ member: third, place: 3 });
    return res;
  }, [deduplicatedMembers]);

  // Copy invite code
  const handleCopyCode = async () => {
    const code = leaderboardData.invite_code || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setToastMessage('Code copied');
    } catch {}
  };

  // Share invite
  const handleShareInvite = async () => {
    const code = leaderboardData.invite_code || '';
    const shareText = `Join my Focalyst group with code ${code} at https://focalyst.online`;
    try {
      await navigator.clipboard.writeText(shareText);
      setToastMessage('Invite copied');
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

  const visibleMembers = showAllMembers
    ? deduplicatedMembers
    : deduplicatedMembers.slice(0, 6);

  return (
    <section id="accountability" className="mt-10 scroll-mt-24">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline">
          <h2 className="font-display text-[28px] leading-[34px] text-ink">Accountability</h2>
          <span className="text-[13px] text-ink-3 ml-3">Stay consistent together.</span>
        </div>

        <div className="flex items-center gap-2.5">
          {allGroups.length >= 2 && allGroups.length <= 3 && (
            <SegmentedControl
              options={allGroups.map((g) => ({ id: g.id, label: g.name }))}
              value={activeGroupId}
              onChange={(val) => setActiveGroupId(val)}
              size="sm"
            />
          )}
          {allGroups.length > 3 && (
            <select
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(e.target.value)}
              aria-label="Active group"
              className="h-8 px-2.5 rounded-[10px] bg-surface-2 border border-line text-[13px] text-ink outline-none"
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionError('');
              setIsJoinModalOpen(true);
            }}
          >
            Join with code
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActionError('');
              setIsCreateModalOpen(true);
            }}
          >
            Create group
          </Button>
        </div>
      </div>

      {/* Main Content: Empty State vs Active Group Card */}
      {!leaderboardData.in_group || deduplicatedMembers.length === 0 ? (
        <div className="frost rounded-[24px] p-8 text-center">
          <h3 className="font-display text-[28px] leading-[34px] text-ink">Stay accountable together.</h3>
          <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-[24px] text-ink-2">
            Create a group or join one with a 6 character code. Members only see your name, your chosen habit and your streak.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setActionError('');
                setIsCreateModalOpen(true);
              }}
            >
              Create group
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActionError('');
                setIsJoinModalOpen(true);
              }}
            >
              Join with code
            </Button>
          </div>
        </div>
      ) : (
        <div className="frost rounded-[24px] p-6 grid grid-cols-1 xl:grid-cols-[minmax(280px,340px)_1fr] gap-7 items-center">
          {/* Left Column: Compact Podium + Invite Code Bar */}
          <div className="flex flex-col items-center">
            {/* Podium */}
            <div className="flex items-end justify-center gap-3 w-full max-w-[320px]">
              {podiumMembers.map(({ member, place }) => {
                const isFirst = place === 1;
                const isSecond = place === 2;
                const isThird = place === 3;

                const heightClass = isFirst
                  ? 'h-[96px]'
                  : isSecond
                  ? 'h-[72px]'
                  : 'h-[56px]';

                const pedestalClass = isFirst
                  ? 'bg-[radial-gradient(120%_120%_at_0%_100%,#1951FC_0%,#0B2CB1_45%,#03195B_100%)] text-snow relative overflow-hidden ambient-grain'
                  : 'bg-surface-2 border border-line text-ink';

                const numberText = `#${place}`;
                const numberSizeClass = isFirst
                  ? 'text-[24px]'
                  : isSecond
                  ? 'text-[20px]'
                  : 'text-[18px]';

                return (
                  <div key={member.user_id} className="flex-1 max-w-[104px] flex flex-col items-center">
                    <MemberAvatar
                      userId={member.user_id}
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      size={44}
                      ring
                    />
                    <div className="text-[13px] font-semibold text-ink truncate max-w-full mt-1.5 text-center">
                      {member.name || 'Member'}
                    </div>
                    <div className="text-[12px] text-ink-2 tabular-nums">
                      {member.streak}d
                    </div>

                    <div
                      className={`mt-2 w-full rounded-t-[14px] flex flex-col items-center justify-center ${heightClass} ${pedestalClass}`}
                    >
                      {isFirst && <Crown size={14} className="mb-1 text-snow/90" />}
                      <span className={`font-display ${numberSizeClass} font-semibold leading-none`}>
                        {numberText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Below podium: Invite code chip + menu */}
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2 w-full max-w-[320px]">
              <div className="bg-surface-2 rounded-[10px] px-2.5 h-8 flex items-center gap-2 font-mono text-[12px] tracking-[0.12em] text-ink">
                <span>{leaderboardData.invite_code || '------'}</span>
                <IconButton
                  icon={Copy}
                  label="Copy code"
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className="h-6 w-6"
                />
              </div>

              <div className="relative">
                <IconButton
                  icon={MoreHorizontal}
                  label="Group options"
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-8 w-8"
                />
                {menuOpen && (
                  <div
                    className="glass-strong liquid absolute right-0 bottom-full mb-1.5 w-44 rounded-[14px] p-1 shadow-lg z-30"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={handleShareInvite}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[10px] text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                    >
                      <UserPlus size={14} className="text-ink-3" />
                      <span>Share invite</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsLeaveModalOpen(true);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[10px] text-[13px] text-danger hover:bg-danger/10 transition-colors text-left"
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
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 mb-2">
              STANDINGS
            </div>

            <div className="space-y-1">
              {visibleMembers.map((member) => (
                <div
                  key={member.user_id}
                  className={`h-[44px] px-3 rounded-[12px] flex items-center gap-3 transition-colors ${
                    member.is_me ? 'bg-primary-soft' : 'hover:bg-surface-2/60'
                  }`}
                >
                  <span className="w-7 text-[12px] tabular-nums text-ink-3">
                    #{member.rank}
                  </span>
                  <MemberAvatar
                    userId={member.user_id}
                    name={member.name}
                    avatarUrl={member.avatar_url}
                    size={28}
                    ring
                  />
                  <div className="truncate text-[13px] font-medium text-ink flex items-center gap-1.5">
                    <span className={member.is_me ? 'text-primary-text font-semibold' : ''}>
                      {member.name || 'Member'}
                    </span>
                    {member.is_me && (
                      <span className="text-[12px] text-primary-text font-semibold">(You)</span>
                    )}
                  </div>
                  <span className="text-[12px] text-ink-3 truncate flex-1 ml-1">
                    {member.habit_name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <Flame size={14} className="text-warning fill-warning" />
                    <span className="text-[13px] tabular-nums text-ink-2 font-medium">
                      {member.streak}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {deduplicatedMembers.length > 6 && (
              <div className="mt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMembers((v) => !v)}
                >
                  {showAllMembers
                    ? 'Show less'
                    : `Show all ${deduplicatedMembers.length}`}
                </Button>
              </div>
            )}
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
        confirmVariant="danger"
        onConfirm={handleLeaveGroup}
      >
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Are you sure you want to leave this accountability group? You can rejoin anytime with the invite code.
        </p>
      </Modal>

      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </section>
  );
}

export default AccountabilitySection;
