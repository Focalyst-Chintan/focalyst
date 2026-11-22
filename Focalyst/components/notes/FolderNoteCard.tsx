import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { FavoriteHeartButton } from '../ui/FavoriteHeartButton';

export interface FolderNoteItem {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  note_type: 'text' | 'voice';
  is_favourite: boolean;
  transcript?: string | null;
  created_at: string;
  updated_at: string;
}

interface FolderNoteCardProps {
  note: FolderNoteItem;
  isDarkMode: boolean;
  isSelected?: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  onOpenMenu: () => void;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractPreview(note: FolderNoteItem): string {
  const raw = (note.note_type === 'voice' ? note.transcript || note.content : note.content) || '';
  const cleaned = raw.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  return cleaned || 'No preview available';
}

const POCKET_PATH =
  'M0 20 C0 9 7 0 18 0 H91 C103 0 108 8 116 10 C128 14 141 10 154 10 H182 Q200 10 200 28 V142 Q200 160 182 160 H18 Q0 160 0 142 Z';

export function FolderNoteCard({
  note,
  isDarkMode,
  isSelected = false,
  onPress,
  onToggleFav,
  onOpenMenu,
}: FolderNoteCardProps) {
  const isVoice = note.note_type === 'voice';
  const title = note.title?.trim() || 'Untitled note';
  const preview = extractPreview(note);
  const dateLabel = formatShortDate(note.updated_at || note.created_at);

  const gradId = `folder-pocket-${note.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && styles.cardPressed,
      ]}
    >
      {({ pressed }) => {
        const isActive = pressed || isSelected;

        const backColor = isActive
          ? isDarkMode
            ? '#1E40AF'
            : '#2563EB'
          : isDarkMode
          ? '#0D111A'
          : '#CBD5E1';

        const paperBg = isActive
          ? isDarkMode
            ? '#EFF6FF'
            : '#FFFFFF'
          : isDarkMode
          ? '#1E2536'
          : '#FFFFFF';

        const paperBorder = isActive
          ? 'transparent'
          : isDarkMode
          ? 'rgba(255, 255, 255, 0.08)'
          : '#CBD5E1';

        const paperTextColor = isActive
          ? isDarkMode
            ? '#1E293B'
            : '#334155'
          : isDarkMode
          ? '#94A3B8'
          : '#475569';

        const pocketGradStart = isActive
          ? isDarkMode
            ? '#3B82F6'
            : '#60A5FA'
          : isDarkMode
          ? '#171C28'
          : '#F8FAFC';

        const pocketGradEnd = isActive
          ? isDarkMode
            ? '#2563EB'
            : '#3B82F6'
          : isDarkMode
          ? '#121620'
          : '#F1F5F9';

        const pocketStroke = isActive
          ? 'rgba(255, 255, 255, 0.25)'
          : isDarkMode
          ? 'rgba(255, 255, 255, 0.09)'
          : '#CBD5E1';

        const badgeBg = isActive
          ? 'rgba(255, 255, 255, 0.22)'
          : isVoice
          ? isDarkMode
            ? 'rgba(225, 29, 72, 0.20)'
            : '#FFE4E6'
          : isDarkMode
          ? 'rgba(37, 99, 235, 0.22)'
          : '#DBEAFE';

        const badgeColor = isActive
          ? '#FFFFFF'
          : isVoice
          ? isDarkMode
            ? '#FB7185'
            : '#E11D48'
          : isDarkMode
          ? '#60A5FA'
          : '#2563EB';

        const titleColor = isActive
          ? '#FFFFFF'
          : isDarkMode
          ? '#F8FAFC'
          : '#0F172A';

        const dateColor = isActive
          ? '#FFFFFF'
          : isDarkMode
          ? '#94A3B8'
          : '#64748B';

        const menuIconColor = isActive
          ? '#FFFFFF'
          : isDarkMode
          ? '#94A3B8'
          : '#64748B';

        return (
          <View style={styles.cardInner}>
            {/* Layer 1: Back Folder Layer with raised top-left tab */}
            <View style={[styles.backTab, { backgroundColor: backColor }]} />
            <View style={[styles.backBody, { backgroundColor: backColor }]} />

            {/* Layer 2: Peeking Note Sheet Layer */}
            <View
              style={[
                styles.paperSheet,
                {
                  backgroundColor: paperBg,
                  borderColor: paperBorder,
                },
              ]}
            >
              <Text style={[styles.paperText, { color: paperTextColor }]} numberOfLines={3}>
                {preview}
              </Text>
            </View>

            {/* Layer 3: Front Folder Pocket Layer (SVG stepped shape) */}
            <View style={styles.pocketContainer}>
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 200 160"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={pocketGradStart} />
                    <Stop offset="1" stopColor={pocketGradEnd} />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d={POCKET_PATH}
                  fill={`url(#${gradId})`}
                  stroke={pocketStroke}
                  strokeWidth={1.2}
                />
              </Svg>

              <View style={styles.pocketContent}>
                <View style={styles.topRow}>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Ionicons
                      name={isVoice ? 'mic' : 'document-text'}
                      size={10}
                      color={badgeColor}
                    />
                    <Text style={[styles.badgeText, { color: badgeColor }]}>
                      {isVoice ? 'Voice' : 'Note'}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <FavoriteHeartButton
                      isFavorite={Boolean(note.is_favourite)}
                      onToggle={onToggleFav}
                      isDarkMode={isDarkMode}
                      size={16}
                    />
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onOpenMenu();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                      style={styles.menuBtn}
                      accessibilityLabel={`More options for ${title}`}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={menuIconColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
                  {title}
                </Text>

                <Text style={[styles.date, { color: dateColor }]} numberOfLines={1}>
                  {dateLabel}
                </Text>
              </View>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    minHeight: 168,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardInner: {
    flex: 1,
    minHeight: 168,
    position: 'relative',
    paddingTop: 34,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  backTab: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '48%',
    height: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 12,
  },
  backBody: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  paperSheet: {
    position: 'absolute',
    top: 12,
    left: 10,
    right: 10,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  paperText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '400',
  },
  pocketContainer: {
    flex: 1,
    minHeight: 134,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pocketContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  menuBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  title: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 17.5,
  },
  date: {
    marginTop: 'auto',
    paddingTop: 6,
    fontSize: 11,
    lineHeight: 13,
  },
});
