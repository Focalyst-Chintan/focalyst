import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';
import { useUser } from '../../src/utils/UserContext';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoiceNoteRecorder } from '../../src/services/VoiceNoteContext';
import { queryCache } from '../../src/utils/queryCache';
import { AtmosphericScreenBackground } from '../../components/AtmosphericScreenBackground';
import { TactilePressable } from '../../components/ui/TactilePressable';
import { FavoriteHeartButton } from '../../components/ui/FavoriteHeartButton';
import { FolderNoteCard } from '../../components/notes/FolderNoteCard';
import { escapeHtml, markdownToHtml } from '../../src/utils/markdownToHtml';


// ─── Brand colors ─────────────────────────────────────────────────────────
const BRAND      = '#1951fc';
const ACCENT     = '#1951fc';
const BG         = 'transparent';
const CARD       = '#ffffff';
const BORDER     = 'rgba(15, 23, 42, 0.08)';
const TEXT_PRI   = '#0A1530';
const TEXT_SEC   = '#52607A';
const TEXT_MUTED = '#8E98AD';

// ─── Types ──────────────────────────────────────────────────────────────────
type NoteType   = 'text' | 'voice';
type NoteFilter = 'All' | 'Notes' | 'Favourite' | 'Voice notes';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;      // Typed text for standard, summary for voice notes
  note_type: NoteType;
  is_favourite: boolean;
  transcript?: string | null;   // Raw audio transcription for voice notes
  audio_url?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diffMs   = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7)  return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Note Card ───────────────────────────────────────────────────────────────
// ─── Note Card ───────────────────────────────────────────────────────────────
function NoteCard({
  note, onPress, onToggleFav, onDelete, onExportPdf, onCopy, isDarkMode,
}: {
  note: Note;
  onPress: () => void;
  onToggleFav: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
  onCopy: () => void;
  isDarkMode: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isVoice = note.note_type === 'voice';
  const badgeBg = isVoice
    ? (isDarkMode ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.12)')
    : (isDarkMode ? 'rgba(25, 81, 252, 0.15)' : 'rgba(25, 81, 252, 0.10)');
  const badgeColor = isVoice
    ? (isDarkMode ? '#F87171' : '#DC2626')
    : (isDarkMode ? '#3781fc' : '#1951fc');

  return (
    <TouchableOpacity
      style={[
        styles.noteCard,
        isDarkMode
          ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
          : {
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(15, 23, 42, 0.07)',
              shadowColor: '#0A1530',
              shadowOpacity: 0.04,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >


      <View style={styles.noteCardInner}>
        {/* Header */}
        <View style={styles.noteHeaderRow}>
          <View style={[styles.noteTypeBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name={isVoice ? 'mic' : 'document-text'} size={11} color={badgeColor} />
            <Text style={[styles.noteTypeBadgeText, { color: badgeColor }]}>
              {isVoice ? 'Voice' : 'Note'}
            </Text>
          </View>
          <View style={styles.noteHeaderActions}>
            <FavoriteHeartButton
              isFavorite={Boolean(note.is_favourite)}
              onToggle={onToggleFav}
              isDarkMode={isDarkMode}
              size={18}
            />
            <TouchableOpacity
              onPress={() => setMenuOpen(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={isDarkMode ? '#FFFFFF' : TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.noteTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>
          {note.title || 'Untitled note'}
        </Text>



        <Text style={[styles.noteDate, isDarkMode && { color: '#8E95A9' }]}>{timeAgo(note.updated_at)}</Text>
      </View>

      {/* Native Modal Context Menu (Immune to clipping) */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.modalCenterContainer}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalDropdownMenu,
                isDarkMode
                  ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
                  : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.08)' }
              ]}
            >
              <Text style={[styles.modalMenuTitle, isDarkMode && { color: '#8E98AD' }]}>
                {note.title || 'Untitled note'}
              </Text>
              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
              
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onPress();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="pencil-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Open</Text>
              </TouchableOpacity>
              
              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="copy-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Copy</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onExportPdf();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="document-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Export PDF</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

// ─── Main Screen Component ───────────────────────────────────────────────────
export default function NotesTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useUser();
  const currentUserId = user?.id || profile?.id || '';
  const [userId, setUserId] = useState(currentUserId);

  // Initialize synchronously from SWR queryCache
  const cachedNotes = currentUserId ? (queryCache.getSync<Note[]>(`user:${currentUserId}:notes`) || []) : [];
  const [notes, setNotes] = useState<Note[]>(cachedNotes);
  const [voiceNotes, setVoiceNotes] = useState<Note[]>(cachedNotes.filter(n => n.note_type === 'voice'));
  const [loading, setLoading] = useState(cachedNotes.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<NoteFilter>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [cardMenuNote, setCardMenuNote] = useState<Note | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { openAndStartRecording, bringToFront } = useVoiceNoteRecorder();

  // New Note creation modal state
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle]         = useState('');
  const [isCreating, setIsCreating]             = useState(false);

  // Load persisted view mode ('list' | 'grid')
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('focalyst_notes_view_mode')
      .then((saved) => {
        if (mounted && (saved === 'list' || saved === 'grid')) {
          setViewMode(saved);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === 'list' ? 'grid' : 'list';
      AsyncStorage.setItem('focalyst_notes_view_mode', next).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    if (params?.action === 'newNote') {
      handleCreateNewNote();
      router.setParams({ action: '' });
    } else if (params?.action === 'record-voice' || params?.action === 'start') {
      openAndStartRecording();
      router.setParams({ action: '' });
    } else if (params?.action === 'open') {
      bringToFront();
      router.setParams({ action: '' });
    }
  }, [params?.action, openAndStartRecording, bringToFront]);

  // Keep userId in sync with UserContext
  useEffect(() => {
    if (currentUserId && currentUserId !== userId) {
      setUserId(currentUserId);
      const syncData = queryCache.getSync<Note[]>(`user:${currentUserId}:notes`);
      if (syncData && syncData.length > 0) {
        setNotes(syncData);
        setVoiceNotes(syncData.filter(n => n.note_type === 'voice'));
        setLoading(false);
      }
    }
  }, [currentUserId, userId]);

  // Fetch notes and check theme whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUserAndNotes();
      const checkTheme = async () => {
        try {
          const val = await AsyncStorage.getItem('darkMode');
          if (val !== null) {
            setIsDarkMode(val === 'true');
          }
        } catch (e) {
          console.warn('Error loading theme:', e);
        }
      };
      checkTheme();
    }, [currentUserId])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    const refreshSub = DeviceEventEmitter.addListener('refreshNotes', () => {
      fetchUserAndNotes();
    });
    return () => {
      sub.remove();
      refreshSub.remove();
    };
  }, [currentUserId]);

  async function fetchUserAndNotes() {
    const targetUid = currentUserId || userId;
    if (!targetUid) return;

    try {
      // If we already have notes in memory or cache, do NOT block the screen with loading = true
      const existing = queryCache.getSync<Note[]>(`user:${targetUid}:notes`);
      if (!existing && notes.length === 0) {
        setLoading(true);
      }

      const cacheKey = `user:${targetUid}:notes`;
      const freshNotes = await queryCache.fetchWithCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', targetUid)
            .order('updated_at', { ascending: false });
          if (error) throw error;
          return (data || []) as Note[];
        },
        60_000,
        queryCache.isStale(cacheKey)
      );

      if (freshNotes) {
        setNotes(freshNotes);
        setVoiceNotes(freshNotes.filter(note => note.note_type === 'voice'));
      }
    } catch (e) {
      console.error('Error fetching notes:', e);
    } finally {
      setLoading(false);
    }
  }

  // Handle Note tap -> router push
  function handleNotePress(note: Note) {
    router.push(`/note/${note.id}`);
  }

  // Open the creation modal (Google Docs-style)
  function handleCreateNewNote() {
    if (profile && !profile.isPro && notes.length >= 5) {
      router.push('/paywall');
      return;
    }
    setNewNoteTitle('');
    setShowNewNoteModal(true);
  }

  // Confirm creation from the modal
  async function handleConfirmCreateNote() {
    const trimmedTitle = newNoteTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('Missing Title', 'Please enter a name for your note.');
      return;
    }
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notes')
        .insert([{ title: trimmedTitle, user_id: user.id, note_type: 'text' }])
        .select('id')
        .single();

      if (error) throw error;
      if (data) {
        setShowNewNoteModal(false);
        setNewNoteTitle('');
        const newNoteItem = {
          id: data.id,
          title: trimmedTitle,
          user_id: user.id,
          note_type: 'text' as const,
          is_favourite: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          content: '',
        };
        setNotes(prev => [newNoteItem, ...prev]);
        queryCache.setSync(`user:${user.id}:notes`, (prev: Note[] = []) => [newNoteItem, ...prev]);
        router.push(`/note/${data.id}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create new note');
    } finally {
      setIsCreating(false);
    }
  }

  // Delete note
  function handleDeleteNote(id: string) {
    Alert.alert('Delete Note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setNotes(prev => prev.filter(n => n.id !== id));
          if (userId) {
            queryCache.setSync(`user:${userId}:notes`, (prev: Note[] = []) => prev.filter(n => n.id !== id));
          }
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) fetchUserAndNotes();
        },
      },
    ]);
  }

  // Toggle favorite
  async function handleToggleFav(id: string, current: boolean) {
    const next = !current;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_favourite: next } : n));
    if (userId) {
      queryCache.setSync(`user:${userId}:notes`, (prev: Note[] = []) =>
        prev.map(n => n.id === id ? { ...n, is_favourite: next } : n)
      );
    }
    const { error } = await supabase.from('notes').update({ is_favourite: next }).eq('id', id);
    if (error) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, is_favourite: current } : n));
      if (userId) {
        queryCache.setSync(`user:${userId}:notes`, (prev: Note[] = []) =>
          prev.map(n => n.id === id ? { ...n, is_favourite: current } : n)
        );
      }
    }
  }

  // Copy note text
  async function handleCopy(note: Note) {
    const text = note.note_type === 'voice'
      ? `${note.title}\n\n✨ Summary:\n${note.content || ''}\n\n📝 Transcript:\n${note.transcript || ''}`
      : `${note.title}\n\n${note.content || ''}`;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied ✓', 'Note copied to clipboard');
    } catch {
      Alert.alert('Error', 'Could not copy');
    }
  }

  // Export PDF
  async function handleExportPdf(note: Note) {
    try {
      const isVoiceNote = note.note_type === 'voice';
      const summaryHtml = isVoiceNote && note.content
        ? `<div class="label">✨ Summary</div>${markdownToHtml(note.content)}`
        : '';
      const bodyHtml = isVoiceNote
        ? (note.transcript
            ? `<div class="label">📝 Transcript</div><p class="transcript">${escapeHtml(note.transcript).replace(/\n/g, '<br/>')}</p>`
            : '')
        : `<div>${note.content || ''}</div>`;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{font-family:-apple-system,Helvetica,sans-serif;padding:40px;color:#0f172a}
          h1{color:#4a6c8c;font-size:26px;margin-bottom:4px}
          h2,h3{color:#1e293b;font-size:16px;font-weight:700;margin:18px 0 6px}
          .meta{color:#94a3b8;font-size:12px;margin-bottom:24px}
          .badge{display:inline-block;background:#4a6c8c18;color:#4a6c8c;font-size:11px;padding:2px 8px;border-radius:99px;margin-bottom:16px}
          .label{font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;margin-top:24px;margin-bottom:8px}
          p{font-size:15px;line-height:1.7;margin:0 0 10px}
          ul{margin:8px 0 12px;padding-left:20px}
          li{font-size:15px;line-height:1.6;margin-bottom:4px}
          strong{font-weight:700;color:#0f172a}
          code{background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:13px}
        </style></head><body>
        <div class="badge">${isVoiceNote ? '🎙 Voice Note' : '📄 Note'}</div>
        <h1>${escapeHtml(note.title || 'Untitled')}</h1>
        <div class="meta">Exported ${new Date().toLocaleDateString()} · Focalyst</div>
        ${summaryHtml}
        ${bodyHtml}
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${note.title}.pdf` });
      } else {
        Alert.alert('PDF Saved', uri);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export PDF');
    }
  }

  // Filter notes locally
  const filteredNotes = notes.filter(note => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      note.title?.toLowerCase().includes(q) ||
      note.content?.toLowerCase().includes(q) ||
      note.transcript?.toLowerCase().includes(q);
    switch (activeFilter) {
      case 'Notes':        return matchesSearch && note.note_type === 'text';
      case 'Favourite':    return matchesSearch && note.is_favourite;
      case 'Voice notes':  return matchesSearch && note.note_type === 'voice';
      default:             return matchesSearch;
    }
  });

  const FILTERS: NoteFilter[] = ['All', 'Notes', 'Favourite', 'Voice notes'];
  const isVoiceNoteLocked = !!profile && !profile.isPro && voiceNotes.length >= 2;

  if (loading) {
    return (
      <AtmosphericScreenBackground isDarkMode={isDarkMode} withHeaderPadding={true} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1951fc" />
        <Text style={[styles.loadingText, isDarkMode && { color: '#8E98AD' }]}>Loading notes…</Text>
      </AtmosphericScreenBackground>
    );
  }

  return (
    <AtmosphericScreenBackground isDarkMode={isDarkMode} withHeaderPadding={true} style={styles.container}>
      {/* Search */}
      <View style={styles.searchBarContainer}>
        <View
          style={[
            styles.searchContainer,
            isDarkMode
              ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
              : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.08)' },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={isDarkMode ? '#8E98AD' : TEXT_MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, isDarkMode && { color: '#FFFFFF' }]}
            placeholder={t('notes.searchPlaceholder')}
            placeholderTextColor={isDarkMode ? '#8E98AD' : TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDarkMode ? '#8E98AD' : TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter capsules row + right-edge View Switcher button */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const label =
            f === 'All'
              ? t('notes.all')
              : f === 'Notes'
              ? t('notes.notes')
              : f === 'Favourite'
              ? t('notes.favourite')
              : t('notes.voiceNotes');

          const pillBg = isDarkMode
            ? isActive
              ? '#26334D'
              : 'rgba(30, 41, 59, 0.65)'
            : isActive
            ? '#2563EB'
            : 'rgba(255, 255, 255, 0.85)';

          const pillBorder = isDarkMode
            ? isActive
              ? 'rgba(148, 163, 184, 0.5)'
              : 'rgba(148, 163, 184, 0.22)'
            : isActive
            ? '#2563EB'
            : '#CBD5E1';

          const pillTextColor = isDarkMode
            ? isActive
              ? '#FFFFFF'
              : '#CBD5E1'
            : isActive
            ? '#FFFFFF'
            : '#334155';

          return (
            <Pressable
              key={f}
              style={({ pressed }) => [
                styles.filterPill,
                {
                  backgroundColor: pillBg,
                  borderColor: pillBorder,
                },
                pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: pillTextColor,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={toggleViewMode}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Switch to folder card view' : 'Switch to list view'}
          style={({ pressed }) => [
            styles.viewToggleBtn,
            isDarkMode
              ? { backgroundColor: '#1E293B', borderColor: 'rgba(148, 163, 184, 0.22)' }
              : { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
        >
          {viewMode === 'list' ? (
            <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
              <Rect x={2} y={2} width={5} height={5} rx={1.2} stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth={1.5} />
              <Rect x={11} y={2} width={5} height={5} rx={1.2} stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth={1.5} />
              <Rect x={2} y={11} width={5} height={5} rx={1.2} stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth={1.5} />
              <Rect x={11} y={11} width={5} height={5} rx={1.2} stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth={1.5} />
            </Svg>
          ) : (
            <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
              <Path d="M3 4.5h12M3 9h12M3 13.5h12" stroke={isDarkMode ? '#F8FAFC' : '#1E293B'} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          )}
        </Pressable>
      </View>

      {/* CTA row - Side-by-Side '+ New note' & Red-Outlined 'Voice notes' */}
      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [
            styles.newNoteBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleCreateNewNote}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newNoteBtnText}>{t('notes.newNote')}</Text>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.voiceNoteBtn,
            isDarkMode
              ? {
                  backgroundColor: '#111827',
                  borderColor: isVoiceNoteLocked ? 'rgba(255, 255, 255, 0.15)' : '#EF4444',
                }
              : {
                  backgroundColor: '#FFFFFF',
                  borderColor: isVoiceNoteLocked ? '#CBD5E1' : '#EF4444',
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {
            if (isVoiceNoteLocked) {
              router.push('/paywall');
            } else {
              openAndStartRecording();
            }
          }}
        >
          <Ionicons
            name={isVoiceNoteLocked ? 'lock-closed' : 'mic'}
            size={17}
            color={isVoiceNoteLocked ? (isDarkMode ? '#8E98AD' : TEXT_MUTED) : '#EF4444'}
          />
          <Text
            style={[
              styles.voiceNoteBtnText,
              { color: isVoiceNoteLocked ? (isDarkMode ? '#8E98AD' : TEXT_MUTED) : '#EF4444' },
            ]}
          >
            {t('notes.voiceNotes')}
          </Text>
        </Pressable>
      </View>

      {/* Notes list / 2-column folder grid */}
      <FlatList
        key={viewMode}
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={[
          styles.listContent,
          viewMode === 'grid' && styles.gridContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={isDarkMode ? '#8E98AD' : TEXT_MUTED} />
            <Text style={[styles.emptyTitle, isDarkMode && { color: '#FFFFFF' }]}>No notes here</Text>
            <Text style={[styles.emptySubtitle, isDarkMode && { color: '#8E98AD' }]}>
              {activeFilter === 'All'
                ? 'Tap "New Note" to capture your first thought.'
                : `No ${activeFilter.toLowerCase()} found.`}
            </Text>
          </View>
        }
        renderItem={({ item: note }) =>
          viewMode === 'grid' ? (
            <View style={styles.gridItemWrapper}>
              <FolderNoteCard
                note={note}
                isDarkMode={isDarkMode}
                isSelected={activeCardId === note.id}
                onPress={() => {
                  setActiveCardId(note.id);
                  setTimeout(() => {
                    setActiveCardId(null);
                    handleNotePress(note);
                  }, 140);
                }}
                onToggleFav={() => handleToggleFav(note.id, note.is_favourite)}
                onOpenMenu={() => setCardMenuNote(note)}
              />
            </View>
          ) : (
            <NoteCard
              note={note}
              isDarkMode={isDarkMode}
              onPress={() => handleNotePress(note)}
              onToggleFav={() => handleToggleFav(note.id, note.is_favourite)}
              onDelete={() => handleDeleteNote(note.id)}
              onExportPdf={() => handleExportPdf(note)}
              onCopy={() => handleCopy(note)}
            />
          )
        }
      />

      {/* Shared Context Menu Modal for Folder Cards */}
      <Modal
        transparent
        visible={!!cardMenuNote}
        animationType="fade"
        onRequestClose={() => setCardMenuNote(null)}
      >
        <Pressable
          style={[styles.modalOverlay, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
          onPress={() => setCardMenuNote(null)}
        >
          <View style={styles.modalCenterContainer}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalDropdownMenu,
                isDarkMode
                  ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
                  : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.08)' },
              ]}
            >
              <Text style={[styles.modalMenuTitle, isDarkMode && { color: '#8E98AD' }]}>
                {cardMenuNote?.title || 'Untitled note'}
              </Text>
              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  const target = cardMenuNote;
                  setCardMenuNote(null);
                  if (target) handleNotePress(target);
                }}
                style={styles.menuItem}
              >
                <Ionicons name="pencil-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Open</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  const target = cardMenuNote;
                  setCardMenuNote(null);
                  if (target) handleCopy(target);
                }}
                style={styles.menuItem}
              >
                <Ionicons name="copy-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Copy</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  const target = cardMenuNote;
                  setCardMenuNote(null);
                  if (target) handleExportPdf(target);
                }}
                style={styles.menuItem}
              >
                <Ionicons name="document-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#1951fc'} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode ? { color: '#FFFFFF' } : { color: '#1951fc' }]}>Export PDF</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

              <TouchableOpacity
                onPress={() => {
                  const target = cardMenuNote;
                  setCardMenuNote(null);
                  if (target) handleDeleteNote(target.id);
                }}
                style={styles.menuItem}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      
      {/* Google Docs-Style New Note Creation Modal */}
      <Modal
        transparent
        visible={showNewNoteModal}
        animationType="fade"
        onRequestClose={() => setShowNewNoteModal(false)}
      >
        <Pressable
          style={styles.newNoteModalOverlay}
          onPress={() => setShowNewNoteModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.newNoteModalCard,
              isDarkMode
                ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
                : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.08)' }
            ]}
          >
            {/* Icon */}
            <View style={[styles.newNoteModalIcon, isDarkMode ? { backgroundColor: 'rgba(25, 81, 252, 0.15)' } : { backgroundColor: '#EBF3FF' }]}>
              <Ionicons name="document-text" size={24} color="#1951fc" />
            </View>

            {/* Title */}
            <Text style={[styles.newNoteModalTitle, isDarkMode && { color: '#FFFFFF' }]}>
              New document
            </Text>
            <Text style={[styles.newNoteModalSubtitle, isDarkMode && { color: '#8E98AD' }]}>
              Please name your new note
            </Text>

            {/* Input */}
            <TextInput
              style={[
                styles.newNoteModalInput,
                isDarkMode
                  ? { backgroundColor: '#080c18', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }
                  : { backgroundColor: '#f8fafc', borderColor: 'rgba(15, 23, 42, 0.08)', color: '#0A1530' }
              ]}
              placeholder="Untitled note…"
              placeholderTextColor={isDarkMode ? '#555E75' : TEXT_MUTED}
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
              autoFocus
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleConfirmCreateNote}
              selectionColor={isDarkMode ? '#FFFFFF' : '#1951fc'}
            />

            {/* Buttons */}
            <View style={styles.newNoteModalBtnRow}>
              <TouchableOpacity
                style={[
                  styles.newNoteModalCancelBtn,
                  isDarkMode ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : { backgroundColor: '#f1f5f9' }
                ]}
                onPress={() => { setShowNewNoteModal(false); setNewNoteTitle(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.newNoteModalCancelText, isDarkMode && { color: '#8E98AD' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.newNoteModalCreateBtn, isCreating && { opacity: 0.6 }]}
                onPress={handleConfirmCreateNote}
                disabled={isCreating}
                activeOpacity={0.85}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.newNoteModalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </AtmosphericScreenBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: 'transparent' },
  loadingContainer:{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:     { color: TEXT_SEC, fontSize: 14 },

  // Search
  searchBarContainer: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  searchInput:     { flex: 1, color: TEXT_PRI, fontSize: 14 },

  // Filters + right-edge View Switcher
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 0,
  },
  filterPill: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 12.5,
  },
  viewToggleBtn: {
    width: 36,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CTA
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  newNoteBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    gap: 8,
  },
  newNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  voiceNoteBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  voiceNoteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // List & Grid
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  gridContent: { gap: 12 },
  gridRow:     { gap: 12 },
  gridItemWrapper: { flex: 1, maxWidth: '50%' },
  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: TEXT_PRI },
  emptySubtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },

  // Note Card
  noteCard:        { backgroundColor: CARD, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },

  noteCardInner:   { padding: 14 },
  noteHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noteTypeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  noteTypeBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  noteHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  noteTitle:       { fontSize: 15, fontWeight: '700', color: TEXT_PRI, marginBottom: 6 },
  noteSnippet:     { fontSize: 13, color: TEXT_SEC, lineHeight: 18, marginBottom: 10 },
  aiSummaryRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 10 },
  aiSummaryText:   { flex: 1, fontSize: 12, color: TEXT_SEC, lineHeight: 17, fontStyle: 'italic' },
  noteDate:        { fontSize: 11, color: TEXT_MUTED },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCenterContainer: {
    width: '80%',
    maxWidth: 280,
  },
  modalDropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalMenuTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },

  // ─── New Note Creation Modal ────────────────────────────────────────────
  newNoteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newNoteModalCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  newNoteModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4a6c8c18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  newNoteModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: TEXT_PRI,
    marginBottom: 4,
  },
  newNoteModalSubtitle: {
    fontSize: 13,
    color: TEXT_SEC,
    marginBottom: 20,
  },
  newNoteModalInput: {
    width: '100%',
    height: 48,
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 16,
    fontSize: 15,
    color: TEXT_PRI,
    marginBottom: 22,
  },
  newNoteModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  newNoteModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newNoteModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SEC,
  },
  newNoteModalCreateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newNoteModalCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
