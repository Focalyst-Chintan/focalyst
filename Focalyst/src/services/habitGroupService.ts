import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../utils/supabase';

export const HABIT_GROUP_UPDATED_EVENT = 'FOCALYST_HABIT_GROUP_UPDATED';

export interface GroupLeaderboardMember {
  user_id: string;
  is_me: boolean;
  display_name: string;
  habit_id: string | null;
  habit_name: string;
  streak: number;
  total_days: number;
}

export interface GroupLeaderboardData {
  in_group: boolean;
  group_id?: string;
  invite_code?: string;
  members: GroupLeaderboardMember[];
}

// Local memory cache so opening the Form Group modal shows the existing code in 0ms
let cachedGroupData: GroupLeaderboardData | null = null;

export function getCachedGroupLeaderboard(): GroupLeaderboardData | null {
  return cachedGroupData;
}

function notifyGroupChanged() {
  // IMPORTANT: Do NOT wipe queryCache ('user:') here—that caused Insights to blank into a skeleton!
  DeviceEventEmitter.emit(HABIT_GROUP_UPDATED_EVENT);
}

function generateSixCharCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function formOrUpdateHabitGroup(habitId: string): Promise<{
  group_id: string;
  invite_code: string;
  already_in_group: boolean;
}> {
  const { data, error } = await supabase.rpc('form_or_update_habit_group', {
    p_habit_id: habitId,
  });

  if (!error && data && data.invite_code) {
    await fetchMyGroupLeaderboard();
    notifyGroupChanged();
    return data;
  }

  // Fallback direct table logic if RPC is unavailable
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Please sign in first.');

  const { data: existingMember } = await supabase
    .from('habit_group_members')
    .select('group_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember?.group_id) {
    await supabase
      .from('habit_group_members')
      .update({ habit_id: habitId })
      .eq('user_id', userId);

    const { data: grp } = await supabase
      .from('habit_groups')
      .select('invite_code')
      .eq('id', existingMember.group_id)
      .single();

    cachedGroupData = {
      in_group: true,
      group_id: existingMember.group_id,
      invite_code: grp?.invite_code || '------',
      members: cachedGroupData?.members || [],
    };

    await fetchMyGroupLeaderboard();
    notifyGroupChanged();
    return {
      group_id: existingMember.group_id,
      invite_code: grp?.invite_code || '------',
      already_in_group: true,
    };
  }

  const inviteCode = generateSixCharCode();
  const { data: createdGroup, error: createErr } = await supabase
    .from('habit_groups')
    .insert({ invite_code: inviteCode, created_by: userId, max_members: 5 })
    .select('id, invite_code')
    .single();

  if (createErr || !createdGroup) {
    throw new Error(error?.message || createErr?.message || 'Could not create group.');
  }

  await supabase.from('habit_group_members').insert({
    group_id: createdGroup.id,
    user_id: userId,
    habit_id: habitId,
  });

  cachedGroupData = {
    in_group: true,
    group_id: createdGroup.id,
    invite_code: createdGroup.invite_code,
    members: cachedGroupData?.members || [],
  };

  await fetchMyGroupLeaderboard();
  notifyGroupChanged();
  return {
    group_id: createdGroup.id,
    invite_code: createdGroup.invite_code,
    already_in_group: false,
  };
}

export async function joinHabitGroupByCode(
  inviteCode: string,
  habitId: string
): Promise<{
  success: boolean;
  message: string;
  group_id?: string;
  creator_name?: string;
}> {
  const cleanCode = inviteCode.trim().toUpperCase();

  const { data, error } = await supabase.rpc('join_habit_group_by_code', {
    p_invite_code: cleanCode,
    p_habit_id: habitId,
  });

  if (!error && data) {
    if (data.success) {
      await fetchMyGroupLeaderboard();
      notifyGroupChanged();
    }
    return data;
  }

  // Fallback direct table join if RPC is unavailable
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      return { success: false, message: 'Please sign in first.' };
    }

    const { data: targetGroup } = await supabase
      .from('habit_groups')
      .select('id, created_by')
      .eq('invite_code', cleanCode)
      .maybeSingle();

    if (!targetGroup) {
      return {
        success: false,
        message: 'Invalid invite code. Please check the 6-character code and try again.',
      };
    }

    const { count } = await supabase
      .from('habit_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', targetGroup.id);

    if ((count || 0) >= 5) {
      return {
        success: false,
        message: 'This group is full (maximum 5 members allowed).',
      };
    }

    await supabase.from('habit_group_members').upsert(
      {
        group_id: targetGroup.id,
        user_id: userId,
        habit_id: habitId,
      },
      { onConflict: 'user_id' }
    );

    await fetchMyGroupLeaderboard();
    notifyGroupChanged();
    return {
      success: true,
      group_id: targetGroup.id,
      message: 'Successfully joined the group!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: error?.message || err?.message || 'Invalid invite code. Please check the 6-character code and try again.',
    };
  }
}

export async function leaveCurrentHabitGroup(): Promise<void> {
  const { error } = await supabase.rpc('leave_current_habit_group');
  if (error) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      await supabase
        .from('habit_group_members')
        .delete()
        .eq('user_id', authData.user.id);
    }
  }
  cachedGroupData = { in_group: false, members: [] };
  notifyGroupChanged();
}

export async function fetchMyGroupLeaderboard(): Promise<GroupLeaderboardData> {
  const { data, error } = await supabase.rpc('get_my_group_leaderboard');
  if (!error && data && typeof data.in_group === 'boolean') {
    cachedGroupData = data as GroupLeaderboardData;
    return cachedGroupData;
  }

  // Resilient fallback: direct table check
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return { in_group: false, members: [] };

    const { data: memberRow } = await supabase
      .from('habit_group_members')
      .select('group_id, habit_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberRow?.group_id) {
      cachedGroupData = { in_group: false, members: [] };
      return cachedGroupData;
    }

    const { data: grp } = await supabase
      .from('habit_groups')
      .select('id, invite_code')
      .eq('id', memberRow.group_id)
      .maybeSingle();

    const { data: allGroupMembers } = await supabase
      .from('habit_group_members')
      .select('user_id, habit_id')
      .eq('group_id', memberRow.group_id);

    if (!allGroupMembers || allGroupMembers.length === 0) {
      cachedGroupData = { in_group: false, members: [] };
      return cachedGroupData;
    }

    const memberUserIds = allGroupMembers.map((m: any) => m.user_id);
    const habitIds = allGroupMembers.map((m: any) => m.habit_id).filter(Boolean);

    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', memberUserIds);

    const userMap = new Map(
      (usersData || []).map((u: any) => [
        u.id,
        u.full_name || (u.email ? u.email.split('@')[0] : 'Member'),
      ])
    );

    const { data: habitsData } = await supabase
      .from('habits')
      .select('id, name, current_streak')
      .in('id', habitIds);

    const habitMap = new Map((habitsData || []).map((h: any) => [h.id, h]));

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .in('habit_id', habitIds);

    const logCountMap = new Map<string, number>();
    (logsData || []).forEach((l: any) => {
      logCountMap.set(l.habit_id, (logCountMap.get(l.habit_id) || 0) + 1);
    });

    const members: GroupLeaderboardMember[] = allGroupMembers.map((m: any) => {
      const isMe = m.user_id === userId;
      const h = m.habit_id ? habitMap.get(m.habit_id) : null;
      const fallbackName = isMe
        ? authData?.user?.user_metadata?.full_name || userMap.get(m.user_id) || 'You'
        : userMap.get(m.user_id) || 'Member';

      return {
        user_id: m.user_id,
        is_me: isMe,
        display_name: fallbackName,
        habit_id: m.habit_id,
        habit_name: h?.name || 'Active Habit',
        streak: h?.current_streak || 0,
        total_days: m.habit_id ? logCountMap.get(m.habit_id) || 0 : 0,
      };
    });

    members.sort((a, b) => b.streak - a.streak || b.total_days - a.total_days);

    cachedGroupData = {
      in_group: true,
      group_id: memberRow.group_id,
      invite_code: grp?.invite_code || '------',
      members,
    };
    return cachedGroupData;
  } catch {
    return cachedGroupData || { in_group: false, members: [] };
  }
}
