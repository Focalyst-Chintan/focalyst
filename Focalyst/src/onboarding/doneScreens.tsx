import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight, Copy, LayoutGrid, Plug, Share2 } from 'lucide-react-native';
import type { ScreenProps } from './screens';
import { GROUPS_LOCATION, cleanGroupCode, groupInviteMessage } from './copy';
import { clearPostState } from './draft';
import { pendingGroupFor, runGroupStep, type GroupFailure, type GroupOutcome } from './finish';
import { StepLayout } from './ui/Shell';
import { GhostButton, GlassCard, GradientText, IconTile, PrimaryButton } from './ui/primitives';
import { Statement, Subtitle, TextField, Title } from './ui/patterns';
import { WidgetHowToSheet } from './ui/WidgetHowToSheet';
import { ProChip } from './ui/PlanCard';
import { haptics } from './ui/haptics';
import { useOnboardingTheme } from './ui/theme';
import { fetchMyGroupLeaderboard, type GroupLeaderboardMember } from '../services/habitGroupService';
import { openMcpConnections } from '../utils/openMcpConnections';
import { useBlocking } from '../blocking/BlockingContext';

// Chapter 6, after saving (screens 31 and 32).

const Gap = ({ h }: { h: number }) => <View style={{ height: h }} />;

const FAILURE_LINE: Record<GroupFailure, string> = {
  not_found: "We couldn't find a group with that code. Check it with your friend.",
  full: 'That group is full. Groups have up to 5 people.',
  already_in_group: `You're already in a group. You can manage it from ${GROUPS_LOCATION}.`,
  other: 'Something went wrong. Try again in a moment.',
};

function Standings({ members }: { members: GroupLeaderboardMember[] }) {
  const t = useOnboardingTheme();
  const sorted = [...members].sort((a, b) => b.streak - a.streak).slice(0, 5);
  return (
    <GlassCard style={styles.board}>
      {sorted.map((m, i) => (
        <View
          key={m.user_id}
          style={styles.boardRow}
          accessible
          accessibilityLabel={`${i + 1}. ${m.is_me ? 'You' : m.display_name}, ${m.streak} day streak`}
        >
          <Text style={[styles.rank, { color: t.primaryText }]}>{i + 1}</Text>
          <Text style={[styles.boardName, { color: t.ink }]} numberOfLines={1}>
            {m.is_me ? `${m.display_name} (you)` : m.display_name}
          </Text>
          <Text style={[styles.boardDay, { color: t.ink2 }]}>{`Day ${m.streak}`}</Text>
        </View>
      ))}
      {Array.from({ length: Math.max(0, 5 - sorted.length) }, (_, i) => (
        <View key={`open-${i}`} style={[styles.boardRow, styles.dashed, { borderColor: t.surfaceBorder }]}>
          <Text style={[styles.rank, { color: t.ink3 }]}>{sorted.length + i + 1}</Text>
          <Text style={[styles.boardName, { color: t.ink3, fontWeight: '400' }]}>Invite a friend</Text>
        </View>
      ))}
    </GlassCard>
  );
}

function useMembers(enabled: boolean): GroupLeaderboardMember[] {
  const [members, setMembers] = useState<GroupLeaderboardMember[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchMyGroupLeaderboard()
      .then((data) => !cancelled && setMembers(data.members ?? []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return members;
}

// ─── 31. Your group ────────────────────────────────────────────────────────────

function YourGroup({ answers, post, updatePost, goNext }: ScreenProps) {
  const t = useOnboardingTheme();
  const { showSnackbar } = useBlocking();
  const group: GroupOutcome | null = post?.group ?? null;
  const ok = group && (group.status === 'created' || group.status === 'joined' || group.status === 'existing');
  const members = useMembers(!!ok);
  const [code, setCode] = useState(answers.group?.code ?? '');
  const [busy, setBusy] = useState(false);

  if (!group) return null;

  if (group.status === 'pending') {
    return (
      <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
        <Statement title="Almost there." line="We'll finish setting up your group next time you open Focalyst." />
      </StepLayout>
    );
  }

  if (group.status === 'failed') {
    const retry = async () => {
      const pending = pendingGroupFor({ ...answers, group: { mode: 'join', habit_index: answers.group?.habit_index ?? 0, code } }, post?.habitIds ?? []);
      if (!pending) return;
      setBusy(true);
      try {
        const outcome = await runGroupStep(pending);
        if (outcome.status !== 'failed') haptics.success();
        else haptics.warning();
        updatePost({ group: outcome });
      } finally {
        setBusy(false);
      }
    };
    return (
      <StepLayout
        footerInline
        footer={
          <>
            <PrimaryButton label={busy ? 'Trying…' : 'Try again'} onPress={retry} disabled={busy || code.length !== 6} />
            <GhostButton label="Skip for now" onPress={goNext} />
          </>
        }
      >
        <Title>That code didn't work.</Title>
        <Subtitle>{FAILURE_LINE[group.reason]}</Subtitle>
        <Gap h={24} />
        <TextField
          value={code}
          onChangeText={(text) => setCode(cleanGroupCode(text))}
          placeholder="------"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          accessibilityLabel="Invite code"
          style={styles.codeField}
        />
      </StepLayout>
    );
  }

  const joined = group.status === 'joined' || (group.status === 'existing' && Math.max(group.memberCount, members.length) > 1);
  const inviteCode = group.code ?? '';
  const share = async () => {
    try {
      await Share.share({ message: groupInviteMessage(inviteCode) });
    } catch {
      // Dismissed or unavailable: nothing to do.
    }
  };

  if (joined) {
    const others = Math.max(0, Math.max(group.memberCount, members.length) - 1);
    return (
      <StepLayout centered footer={<PrimaryButton label="Continue" onPress={goNext} />}>
        <Title>You're in.</Title>
        <Subtitle>{`You and ${others} ${others === 1 ? 'friend' : 'friends'} are tracking together.`}</Subtitle>
        <Gap h={24} />
        {members.length > 0 ? <Standings members={members} /> : null}
      </StepLayout>
    );
  }

  return (
    <StepLayout
      footer={
        <>
          <PrimaryButton label="Share invite" onPress={share} />
          <GhostButton label="Done" onPress={goNext} />
        </>
      }
    >
      <Title>Your group is ready.</Title>
      <Subtitle>Share this code with up to 4 friends. They join with it in Focalyst.</Subtitle>
      <Gap h={24} />
      {inviteCode ? (
        <GlassCard style={styles.codeCard}>
          <GradientText text={inviteCode} fontSize={44} style={{ letterSpacing: 6 }} />
          <View style={styles.codeActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy code"
              onPress={async () => {
                await Clipboard.setStringAsync(inviteCode).catch(() => {});
                haptics.success();
                showSnackbar('Code copied');
              }}
              style={({ pressed }) => [styles.codeButton, { backgroundColor: t.surfaceStrong, opacity: pressed ? 0.7 : 1 }]}
            >
              <Copy size={16} color={t.primaryText} />
              <Text style={[styles.codeButtonText, { color: t.ink }]}>Copy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share code"
              onPress={share}
              style={({ pressed }) => [styles.codeButton, { backgroundColor: t.surfaceStrong, opacity: pressed ? 0.7 : 1 }]}
            >
              <Share2 size={16} color={t.primaryText} />
              <Text style={[styles.codeButtonText, { color: t.ink }]}>Share</Text>
            </Pressable>
          </View>
        </GlassCard>
      ) : null}
      <Gap h={16} />
      {members.length > 0 ? <Standings members={members} /> : null}
    </StepLayout>
  );
}

// ─── 32. You're all set ────────────────────────────────────────────────────────

function NextStep({ icon, title, onPress, pro }: { icon: typeof LayoutGrid; title: string; onPress: () => void; pro?: boolean }) {
  const t = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.nextRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <IconTile icon={icon} size={36} iconSize={18} />
      <Text style={[styles.nextTitle, { color: t.ink }]}>{title}</Text>
      {pro ? <ProChip /> : null}
      <ChevronRight size={18} color={t.ink3} />
    </Pressable>
  );
}

function AllSet({ answers, isPro }: ScreenProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState(false);

  // Onboarding is done: the post state isn't needed any more.
  useEffect(() => {
    clearPostState();
  }, []);

  return (
    <StepLayout
      centered
      footer={
        <>
          {/* The Focus tab picks up the plan's preset (onboarding:recommendedPreset) on first open. */}
          <PrimaryButton label="Start my first focus session" onPress={() => router.replace('/(tabs)/focus' as any)} />
          <GhostButton label="Go to my plan" onPress={() => router.replace('/(tabs)/plan' as any)} />
        </>
      }
    >
      <Statement
        title={answers.name ? `You're all set, ${answers.name}.` : "You're all set."}
        line="Your plan is ready. The best time to start is now."
      />
      <Gap h={28} />
      <GlassCard style={styles.nextCard}>
        <NextStep icon={LayoutGrid} title="Add a widget" onPress={() => setSheet(true)} />
        {isPro ? <NextStep icon={Plug} title="Connect Claude or ChatGPT" onPress={() => openMcpConnections()} pro /> : null}
      </GlassCard>
      <WidgetHowToSheet visible={sheet} onClose={() => setSheet(false)} />
    </StepLayout>
  );
}

export const DONE_SCREENS = {
  31: YourGroup,
  32: AllSet,
} as const;

const styles = StyleSheet.create({
  board: { padding: 12, gap: 8, borderRadius: 20 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36, paddingHorizontal: 8, borderRadius: 12 },
  dashed: { borderWidth: 1, borderStyle: 'dashed' },
  rank: { width: 16, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  boardName: { flex: 1, fontSize: 15, fontWeight: '600' },
  boardDay: { fontSize: 14, fontWeight: '500' },
  codeField: { letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  codeCard: { padding: 20, borderRadius: 20, alignItems: 'center', gap: 16 },
  codeActions: { flexDirection: 'row', gap: 12 },
  codeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: 20 },
  codeButtonText: { fontSize: 15, fontWeight: '600' },
  nextCard: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  nextTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
});
