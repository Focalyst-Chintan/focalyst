import { createClient } from '@/lib/supabase'

export interface GroupLeaderboardMember {
    user_id: string
    is_me: boolean
    display_name: string
    habit_id: string | null
    habit_name: string
    streak: number
    total_days: number
}

export interface GroupLeaderboardData {
    in_group: boolean
    group_id?: string
    invite_code?: string
    members: GroupLeaderboardMember[]
}

function generateSixCharCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export async function fetchMyGroupLeaderboard(): Promise<GroupLeaderboardData> {
    const supabase = createClient()

    // 1. Try RPC
    try {
        const { data, error } = await supabase.rpc('get_my_group_leaderboard')
        if (!error && data && typeof data.in_group === 'boolean') {
            return data as GroupLeaderboardData
        }
    } catch {}

    // 2. Direct Supabase Table Fallback
    try {
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData?.user?.id
        if (!userId) return { in_group: false, members: [] }

        const { data: memberRow } = await supabase
            .from('habit_group_members')
            .select('group_id, habit_id')
            .eq('user_id', userId)
            .maybeSingle()

        if (!memberRow?.group_id) {
            return { in_group: false, members: [] }
        }

        const { data: grp } = await supabase
            .from('habit_groups')
            .select('id, invite_code')
            .eq('id', memberRow.group_id)
            .maybeSingle()

        const { data: allGroupMembers } = await supabase
            .from('habit_group_members')
            .select('user_id, habit_id')
            .eq('group_id', memberRow.group_id)

        if (!allGroupMembers || allGroupMembers.length === 0) {
            return {
                in_group: true,
                group_id: memberRow.group_id,
                invite_code: grp?.invite_code || '------',
                members: [],
            }
        }

        const userIds = (allGroupMembers as { user_id: string; habit_id: string | null }[]).map((m) => m.user_id)
        const habitIds = (allGroupMembers as { user_id: string; habit_id: string | null }[]).map((m) => m.habit_id).filter((id): id is string => Boolean(id))

        // Prefer group_member_profiles RPC to avoid reading protected users table rows
        let profilesMap = new Map<string, string>()
        try {
            const { data: profilesData, error: profilesErr } = await supabase.rpc('group_member_profiles', {
                p_group: memberRow.group_id,
            })
            if (!profilesErr && Array.isArray(profilesData)) {
                for (const p of profilesData) {
                    profilesMap.set(String(p.id), String(p.full_name || 'Member'))
                }
            }
        } catch {}

        const [usersRes, habitsRes, logsRes] = await Promise.all([
            profilesMap.size === 0
                ? supabase.from('users').select('id, full_name, email').in('id', userIds)
                : Promise.resolve({ data: [] }),
            habitIds.length > 0
                ? supabase.from('habits').select('id, name, current_streak').in('id', habitIds)
                : Promise.resolve({ data: [] }),
            habitIds.length > 0
                ? supabase.from('habit_logs').select('habit_id')
                : Promise.resolve({ data: [] }),
        ])

        const usersMap = profilesMap.size > 0
            ? profilesMap
            : new Map<string, string>(
                (usersRes.data || []).map((u: any) => [String(u.id), String(u.full_name || u.email?.split('@')[0] || 'Member')])
            )
        const habitsMap = new Map<string, any>((habitsRes.data || []).map((h: any) => [String(h.id), h]))

        // Count total log days per habit
        const logCounts: Record<string, number> = {}
        for (const log of ((logsRes.data || []) as any[])) {
            const hId = String(log.habit_id)
            logCounts[hId] = (logCounts[hId] || 0) + 1
        }

        const members: GroupLeaderboardMember[] = (allGroupMembers as { user_id: string; habit_id: string | null }[]).map((m) => {
            const isMe = m.user_id === userId
            const h = m.habit_id ? habitsMap.get(String(m.habit_id)) : null
            const name = usersMap.get(m.user_id) || (isMe ? 'You' : 'Member')

            return {
                user_id: m.user_id,
                is_me: isMe,
                display_name: isMe ? `${name} (You)` : name,
                habit_id: m.habit_id,
                habit_name: String(h?.name || 'Active Habit'),
                streak: Number(h?.current_streak || 0),
                total_days: m.habit_id ? Number(logCounts[String(m.habit_id)] || 0) : 0,
            }
        })

        // Sort members by streak desc, then total_days desc
        members.sort((a, b) => b.streak - a.streak || b.total_days - a.total_days)

        // P7: Group standings top 50 plus current user always
        let pagedMembers = members
        if (members.length > 50) {
            const top50 = members.slice(0, 50)
            const userInTop50 = top50.some((m) => m.is_me)
            if (!userInTop50) {
                const userRow = members.find((m) => m.is_me)
                if (userRow) {
                    top50.push(userRow)
                }
            }
            pagedMembers = top50
        }

        return {
            in_group: true,
            group_id: memberRow.group_id,
            invite_code: grp?.invite_code || '------',
            members: pagedMembers,
        }
    } catch (err) {
        console.error('Error fetching group leaderboard:', err)
        return { in_group: false, members: [] }
    }
}

export async function formOrUpdateHabitGroup(habitId: string): Promise<{
    group_id: string
    invite_code: string
    already_in_group: boolean
}> {
    const supabase = createClient()

    try {
        const { data, error } = await supabase.rpc('form_or_update_habit_group', {
            p_habit_id: habitId,
        })
        if (!error && data?.invite_code) {
            return data
        }
    } catch {}

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) throw new Error('Please sign in first.')

    const { data: existingMember } = await supabase
        .from('habit_group_members')
        .select('group_id')
        .eq('user_id', userId)
        .maybeSingle()

    if (existingMember?.group_id) {
        await supabase
            .from('habit_group_members')
            .update({ habit_id: habitId })
            .eq('user_id', userId)

        const { data: grp } = await supabase
            .from('habit_groups')
            .select('invite_code')
            .eq('id', existingMember.group_id)
            .single()

        return {
            group_id: existingMember.group_id,
            invite_code: grp?.invite_code || '------',
            already_in_group: true,
        }
    }

    const inviteCode = generateSixCharCode()
    const { data: createdGroup, error: createErr } = await supabase
        .from('habit_groups')
        .insert({ invite_code: inviteCode, created_by: userId, max_members: 5 })
        .select('id, invite_code')
        .single()

    if (createErr || !createdGroup) {
        throw new Error(createErr?.message || 'Could not create habit group.')
    }

    await supabase.from('habit_group_members').insert({
        group_id: createdGroup.id,
        user_id: userId,
        habit_id: habitId,
    })

    return {
        group_id: createdGroup.id,
        invite_code: createdGroup.invite_code,
        already_in_group: false,
    }
}

export async function joinHabitGroupByCode(
    inviteCode: string,
    habitId: string
): Promise<{ success: boolean; message: string; group_id?: string }> {
    const supabase = createClient()
    const cleanCode = inviteCode.trim().toUpperCase()

    // 1. Try join_group RPC (spec S8)
    try {
        const { data: joinedId, error: joinErr } = await supabase.rpc('join_group', {
            p_code: cleanCode,
        })
        if (!joinErr && joinedId) {
            // Update the habit_id for this user in the group if habitId was supplied
            if (habitId) {
                const { data: authData } = await supabase.auth.getUser()
                if (authData?.user?.id) {
                    await supabase
                        .from('habit_group_members')
                        .update({ habit_id: habitId })
                        .eq('user_id', authData.user.id)
                        .eq('group_id', joinedId)
                }
            }
            return {
                success: true,
                group_id: joinedId,
                message: 'Successfully joined the habit group!',
            }
        }
    } catch {}

    // 2. Try legacy join_habit_group_by_code RPC
    try {
        const { data, error } = await supabase.rpc('join_habit_group_by_code', {
            p_invite_code: cleanCode,
            p_habit_id: habitId,
        })
        if (!error && data) return data
    } catch {}

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return { success: false, message: 'Please sign in first.' }

    const { data: targetGroup } = await supabase
        .from('habit_groups')
        .select('id, created_by')
        .eq('invite_code', cleanCode)
        .maybeSingle()

    if (!targetGroup) {
        return { success: false, message: 'Invalid invite code. Please check and try again.' }
    }

    const { count } = await supabase
        .from('habit_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', targetGroup.id)

    if ((count || 0) >= 5) {
        return { success: false, message: 'This group is full (max 5 members).' }
    }

    await supabase.from('habit_group_members').upsert(
        {
            group_id: targetGroup.id,
            user_id: userId,
            habit_id: habitId,
        },
        { onConflict: 'user_id' }
    )

    return {
        success: true,
        group_id: targetGroup.id,
        message: 'Successfully joined the habit group!',
    }
}

export async function leaveCurrentHabitGroup(): Promise<void> {
    const supabase = createClient()
    try {
        await supabase.rpc('leave_current_habit_group')
    } catch {}

    const { data: authData } = await supabase.auth.getUser()
    if (authData?.user?.id) {
        await supabase
            .from('habit_group_members')
            .delete()
            .eq('user_id', authData.user.id)
    }
}
