'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Trophy,
    Users,
    Copy,
    Check,
    ChevronRight,
    X,
    Flame,
    LogOut,
    Plus,
    Share2,
    Crown
} from 'lucide-react'
import {
    fetchMyGroupLeaderboard,
    formOrUpdateHabitGroup,
    joinHabitGroupByCode,
    leaveCurrentHabitGroup,
    GroupLeaderboardData,
    GroupLeaderboardMember
} from '@/lib/services/habitGroupService'

interface HabitGroupLeaderboardSectionProps {
    activeHabits?: any[]
    userId?: string | null
    onRefreshInsights?: () => void
}

export default function HabitGroupLeaderboardSection({
    activeHabits = [],
    userId,
    onRefreshInsights,
}: HabitGroupLeaderboardSectionProps) {
    const [groupData, setGroupData] = useState<GroupLeaderboardData>({
        in_group: false,
        members: [],
    })
    const [loading, setLoading] = useState(true)
    const [modalVisible, setModalVisible] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [selectedHabitId, setSelectedHabitId] = useState<string>('')
    const [joinCode, setJoinCode] = useState('')
    const [copiedCode, setCopiedCode] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const loadGroup = useCallback(async () => {
        try {
            setLoading(true)
            const data = await fetchMyGroupLeaderboard()
            setGroupData(data || { in_group: false, members: [] })
        } catch (e) {
            console.error('Error loading habit group:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadGroup()

        const handleHabitUpdated = () => loadGroup()
        window.addEventListener('focalyst:habit-updated', handleHabitUpdated)
        return () => window.removeEventListener('focalyst:habit-updated', handleHabitUpdated)
    }, [loadGroup])

    // Set default habit selection
    useEffect(() => {
        if (activeHabits.length > 0 && !selectedHabitId) {
            setSelectedHabitId(activeHabits[0].id)
        }
    }, [activeHabits, selectedHabitId])

    // Enrich members with user's active habit info if local state has higher values
    const enrichedMembers = useMemo(() => {
        return groupData.members.map((m) => {
            const cleanName = (m.display_name || '').replace(/\s*\(you\)/i, '').trim()
            if (m.is_me) {
                const localHabit = activeHabits.find(h => h.id === m.habit_id) || activeHabits[0]
                return {
                    ...m,
                    display_name: cleanName || 'You',
                    streak: Math.max(m.streak, localHabit?.current_streak || 0),
                    total_days: Math.max(m.total_days, localHabit?.total_days || (localHabit?.completedDates?.length || 0)),
                    habit_name: m.habit_name && m.habit_name !== 'Active Habit'
                        ? m.habit_name
                        : localHabit?.name || 'Active Habit',
                }
            }
            return {
                ...m,
                display_name: cleanName || 'Member',
            }
        })
    }, [groupData.members, activeHabits])

    // Sort members by streak descending, then total completed days
    const sortedMembers = useMemo(() => {
        return [...enrichedMembers].sort(
            (a, b) => b.streak - a.streak || b.total_days - a.total_days
        )
    }, [enrichedMembers])

    const myIndex = sortedMembers.findIndex((m) => m.is_me)
    const myMember = myIndex >= 0 ? sortedMembers[myIndex] : null
    const myRank = myIndex >= 0 ? myIndex + 1 : 1
    const memberCount = sortedMembers.length
    const inviteCode = groupData.invite_code || ''

    const handleCopyCode = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!inviteCode) return
        try {
            await navigator.clipboard.writeText(inviteCode)
            setCopiedCode(true)
            setTimeout(() => setCopiedCode(false), 2000)
        } catch {}
    }

    const handleCreateGroup = async () => {
        if (!selectedHabitId) {
            setErrorMsg('Please select a habit to share.')
            return
        }
        setActionLoading(true)
        setErrorMsg('')
        try {
            await formOrUpdateHabitGroup(selectedHabitId)
            await loadGroup()
            onRefreshInsights?.()
            setShowCreateModal(false)
        } catch (e: any) {
            setErrorMsg(e?.message || 'Could not create group.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleJoinGroup = async () => {
        const clean = joinCode.trim().toUpperCase()
        if (clean.length < 6) {
            setErrorMsg('Enter the 6-character invite code.')
            return
        }
        if (!selectedHabitId) {
            setErrorMsg('Please select a habit to share.')
            return
        }
        setActionLoading(true)
        setErrorMsg('')
        try {
            const res = await joinHabitGroupByCode(clean, selectedHabitId)
            if (res.success) {
                await loadGroup()
                onRefreshInsights?.()
                setShowJoinModal(false)
                setJoinCode('')
            } else {
                setErrorMsg(res.message || 'Invalid invite code.')
            }
        } catch (e: any) {
            setErrorMsg(e?.message || 'Failed to join group.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this habit group? You will be removed from the leaderboard.')) return
        setActionLoading(true)
        try {
            await leaveCurrentHabitGroup()
            await loadGroup()
            onRefreshInsights?.()
            setModalVisible(false)
        } catch (e: any) {
            alert(e?.message || 'Could not leave group.')
        } finally {
            setActionLoading(false)
        }
    }

    // Top 3 for Podium: [2nd, 1st, 3rd]
    const firstPlace = sortedMembers[0] || null
    const secondPlace = sortedMembers[1] || null
    const thirdPlace = sortedMembers[2] || null

    return (
        <section className="w-full">
            {/* ─── Compact Preview Card in Insights ─── */}
            <div
                onClick={() => setModalVisible(true)}
                className="w-full p-4 sm:p-5 bg-[var(--m-surface)] border border-line rounded-[24px] shadow-sm cursor-pointer transition-all hover:border-line-strong relative overflow-hidden"
            >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-[#2B6BFF]">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-ink truncate">
                            Habit leaderboard
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {groupData.in_group && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#1E293B] text-[#2B6BFF] text-xs font-semibold">
                                <Users className="w-3.5 h-3.5" />
                                <span>{memberCount}/5</span>
                            </div>
                        )}
                        <span className="flex items-center text-xs font-semibold text-[#2B6BFF]">
                            View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                    </div>
                </div>

                {groupData.in_group ? (
                    <>
                        {/* User Position Banner */}
                        <div className="p-3 bg-[var(--m-surface-strong)] border border-slate-200/60 dark:border-[#1F293D] rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#2B6BFF] text-white flex items-center justify-center font-semibold text-sm shadow-sm shrink-0">
                                    #{myRank}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-ink">
                                            Rank #{myRank} of {memberCount}
                                        </span>
                                        <span className="px-1.5 py-0.2 bg-[#2B6BFF]/15 text-[#2B6BFF] text-[10px] font-semibold rounded">
                                            YOU
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-ink-2 truncate mt-0.5">
                                        {myMember?.habit_name || 'Active habit'} • 🔥 {myMember?.streak || 0}d streak • {myMember?.total_days || 0} total days
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                        </div>

                        {/* Invite Code Pill */}
                        {inviteCode && (
                            <div className="flex items-center justify-between mt-3 px-1 text-xs text-ink-2">
                                <span className="font-mono text-[11px]">
                                    Invite code: <span className="font-bold text-ink">{inviteCode}</span>
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    className="flex items-center gap-1 text-[#2B6BFF] font-semibold hover:underline"
                                >
                                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Not in Group State */
                    <div className="text-center py-3">
                        <p className="text-xs text-ink-2 mb-3">
                            Join or form a habit group to compete on streaks with friends!
                        </p>
                        <div className="flex gap-2.5 justify-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowCreateModal(true) }}
                                className="px-4 py-2 bg-[#2B6BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                            >
                                Create group
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowJoinModal(true) }}
                                className="px-4 py-2 bg-slate-100 dark:bg-[#0B1021] text-ink hover:bg-slate-200 text-xs font-semibold rounded-xl border border-line transition-all"
                            >
                                Join with Code
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Full Habit Leaderboard Modal / View ─── */}
            {modalVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-lg bg-[#0B1021] text-white border border-[#222A41] rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                        {/* Header Banner (Royal Blue Gradient) */}
                        <div className="p-5 bg-gradient-to-br from-[#0B2CB1] to-[#0B1021] border-b border-[#222A41] relative">
                            <button
                                onClick={() => setModalVisible(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-5 h-5 text-amber-400" />
                                <span className="text-xs font-semibold tracking-wide text-blue-200">Focalyst leaderboard</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-semibold">Habit group standings</h2>

                            {groupData.in_group && inviteCode && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs text-blue-200">
                                    <span className="font-mono">
                                        Group Code: <strong className="text-white tracking-widest">{inviteCode}</strong>
                                    </span>
                                    <button
                                        onClick={handleCopyCode}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 font-semibold text-white transition-all"
                                    >
                                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedCode ? 'Copied' : 'Copy code'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1">
                            {/* Standings Podium (Top 3) */}
                            {sortedMembers.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-4 pb-2">
                                    {/* 2nd Place */}
                                    <div className="flex flex-col items-center">
                                        {secondPlace ? (
                                            <>
                                                <span className="text-xs font-bold text-slate-300 truncate max-w-full text-center">
                                                    {secondPlace.display_name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-full">
                                                    {secondPlace.habit_name}
                                                </span>
                                                <div className="w-full mt-2 h-20 bg-gradient-to-t from-[#151B2E] to-[#1E293B] border border-slate-700/60 rounded-2xl flex flex-col items-center justify-center shadow-lg relative">
                                                    <span className="text-lg font-semibold text-slate-400">#2</span>
                                                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                                                        🔥 {secondPlace.streak}d
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">{secondPlace.total_days} days</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-16 border border-dashed border-slate-800 rounded-2xl" />
                                        )}
                                    </div>

                                    {/* 1st Place (Center, Elevated) */}
                                    <div className="flex flex-col items-center">
                                        {firstPlace ? (
                                            <>
                                                <Crown className="w-5 h-5 text-amber-400 animate-bounce mb-0.5" />
                                                <span className="text-xs sm:text-sm font-semibold text-amber-300 truncate max-w-full text-center">
                                                    {firstPlace.display_name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-full">
                                                    {firstPlace.habit_name}
                                                </span>
                                                <div className="w-full mt-2 h-28 bg-gradient-to-t from-[#151B2E] via-[#1E2D5A] to-[#2B6BFF]/30 border-2 border-amber-400/80 rounded-2xl flex flex-col items-center justify-center shadow-xl relative">
                                                    <span className="text-2xl font-semibold text-amber-400">#1</span>
                                                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-0.5">
                                                        🔥 {firstPlace.streak}d
                                                    </span>
                                                    <span className="text-[10px] text-slate-300 font-semibold">{firstPlace.total_days} total days</span>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>

                                    {/* 3rd Place */}
                                    <div className="flex flex-col items-center">
                                        {thirdPlace ? (
                                            <>
                                                <span className="text-xs font-bold text-slate-300 truncate max-w-full text-center">
                                                    {thirdPlace.display_name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-full">
                                                    {thirdPlace.habit_name}
                                                </span>
                                                <div className="w-full mt-2 h-16 bg-gradient-to-t from-[#151B2E] to-[#1E293B] border border-slate-700/60 rounded-2xl flex flex-col items-center justify-center shadow-lg relative">
                                                    <span className="text-base font-semibold text-amber-600">#3</span>
                                                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                                                        🔥 {thirdPlace.streak}d
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">{thirdPlace.total_days} days</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-14 border border-dashed border-slate-800 rounded-2xl" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Full Standings List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-400 px-1">
                                    All Members ({memberCount})
                                </h4>
                                <div className="space-y-2">
                                    {sortedMembers.map((m, idx) => (
                                        <div
                                            key={m.user_id || idx}
                                            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                                                m.is_me
                                                    ? 'bg-[#2B6BFF]/15 border-[#2B6BFF] shadow-sm'
                                                    : 'bg-[#151B2E] border-[#222A41]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-7 h-7 rounded-xl bg-[#0B1021] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                                                    #{idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-bold text-white truncate">
                                                            {m.display_name}
                                                        </span>
                                                        {m.is_me && (
                                                            <span className="px-1.5 py-0.5 bg-[#2B6BFF] text-white text-[10px] font-semibold rounded-md">
                                                                YOU
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        Sharing: <span className="text-slate-300 font-medium">{m.habit_name}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 ml-2">
                                                <span className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
                                                    🔥 {m.streak}d streak
                                                </span>
                                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                                    {m.total_days} total days
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions / Leave Group */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={handleLeave}
                                    disabled={actionLoading}
                                    className="flex items-center justify-center gap-1.5 w-full h-11 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold rounded-2xl transition-all disabled:opacity-50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Leave group</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Create Group Modal ─── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md bg-[var(--m-surface)] border border-line rounded-[24px] p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between pb-2 border-b border-line">
                            <h3 className="text-lg font-bold text-ink">Form a Habit Group</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-ink-2 leading-relaxed">
                            Create a group with an invite code. Up to 5 friends can join and track their streaks on the shared leaderboard!
                        </p>

                        <div>
                            <label className="m-footnote text-ink-2 block mb-2">
                                Choose Habit to Share
                            </label>
                            {activeHabits.length === 0 ? (
                                <p className="text-xs text-amber-500 font-semibold">Please create a habit in Plan first.</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {activeHabits.map((h) => (
                                        <button
                                            key={h.id}
                                            type="button"
                                            onClick={() => setSelectedHabitId(h.id)}
                                            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                                selectedHabitId === h.id
                                                    ? 'bg-[#2B6BFF]/10 border-[#2B6BFF] text-[#2B6BFF]'
                                                    : 'bg-[var(--m-surface-strong)] border-line text-ink'
                                            }`}
                                        >
                                            <span className="text-sm font-semibold truncate">{h.icon || '🎯'} {h.name}</span>
                                            <span className="text-xs font-bold">🔥 {h.current_streak || 0}d</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 h-11 bg-slate-100 dark:bg-[#0B1021] text-ink-2 font-bold rounded-2xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateGroup}
                                disabled={actionLoading || activeHabits.length === 0}
                                className="flex-1 h-11 bg-[#2B6BFF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-50"
                            >
                                {actionLoading ? 'Creating' : 'Create group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Join with Code Modal ─── */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md bg-[var(--m-surface)] border border-line rounded-[24px] p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between pb-2 border-b border-line">
                            <h3 className="text-lg font-bold text-ink">Join a habit group</h3>
                            <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-full text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="m-footnote text-ink-2 block mb-1.5">
                                6-character invite code
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                value={joinCode}
                                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setErrorMsg('') }}
                                placeholder="e.g. 6RP8Z3"
                                className="w-full h-12 bg-[var(--m-surface-strong)] border border-line rounded-2xl px-4 text-center font-mono text-xl font-bold uppercase tracking-widest text-ink outline-none focus:ring-2 focus:ring-[#2B6BFF]/40"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="m-footnote text-ink-2 block mb-2">
                                Choose Your Habit to Share
                            </label>
                            {activeHabits.length === 0 ? (
                                <p className="text-xs text-amber-500 font-semibold">Please create a habit in Plan first.</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {activeHabits.map((h) => (
                                        <button
                                            key={h.id}
                                            type="button"
                                            onClick={() => setSelectedHabitId(h.id)}
                                            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                                selectedHabitId === h.id
                                                    ? 'bg-[#2B6BFF]/10 border-[#2B6BFF] text-[#2B6BFF]'
                                                    : 'bg-[var(--m-surface-strong)] border-line text-ink'
                                            }`}
                                        >
                                            <span className="text-sm font-semibold truncate">{h.icon || '🎯'} {h.name}</span>
                                            <span className="text-xs font-bold">🔥 {h.current_streak || 0}d</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 h-11 bg-slate-100 dark:bg-[#0B1021] text-ink-2 font-bold rounded-2xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleJoinGroup}
                                disabled={actionLoading || activeHabits.length === 0 || joinCode.length < 6}
                                className="flex-1 h-11 bg-[#2B6BFF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-50"
                            >
                                {actionLoading ? 'Joining' : 'Join group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
