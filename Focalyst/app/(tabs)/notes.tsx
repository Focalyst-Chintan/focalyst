import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/utils/UserContext';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceNoteRecorderModal } from '../../components/VoiceNoteRecorderModal';
import { Platform } from 'react-native';
import { queryCache } from '../../src/utils/queryCache';
import { ScreenSkeleton } from '../../components/ui/ScreenSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Brand colors ─────────────────────────────────────────────────────────
const BRAND      = '#4a6c8c';
const ACCENT     = '#ff6b2b';
const BG         = '#f8fafc';
const CARD       = '#ffffff';
const BORDER     = '#e2e8f0';
const TEXT_PRI   = '#0f172a';
const TEXT_SEC   = '#64748b';
const TEXT_MUTED = '#94a3b8';

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
  const accent = note.note_type === 'voice' ? ACCENT : BRAND;

  return (
    <TouchableOpacity
      style={[styles.noteCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >


      <View style={styles.noteCardInner}>
        {/* Header */}
        <View style={styles.noteHeaderRow}>
          <View style={[styles.noteTypeBadge, { backgroundColor: accent + '1a' }]}>
            <Ionicons name={note.note_type === 'voice' ? 'mic' : 'document-text'} size={11} color={accent} />
            <Text style={[styles.noteTypeBadgeText, { color: accent }]}>
              {note.note_type === 'voice' ? 'Voice' : 'Note'}
            </Text>
          </View>
          <View style={styles.noteHeaderActions}>
            <TouchableOpacity onPress={onToggleFav} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={note.is_favourite ? 'heart' : 'heart-outline'}
                size={18}
                color={note.is_favourite ? '#ff6b2b' : (isDarkMode ? '#8E95A9' : TEXT_MUTED)}
              />
            </TouchableOpacity>
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
              style={[styles.modalDropdownMenu, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}
            >
              <Text style={[styles.modalMenuTitle, isDarkMode && { color: '#8E95A9' }]}>
                {note.title || 'Untitled note'}
              </Text>
              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />
              
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onPress();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="pencil-outline" size={16} color={isDarkMode ? '#FFFFFF' : BRAND} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode && { color: '#FFFFFF' }]}>Open</Text>
              </TouchableOpacity>
              
              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="copy-outline" size={16} color={isDarkMode ? '#FFFFFF' : BRAND} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode && { color: '#FFFFFF' }]}>Copy</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  onExportPdf();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="document-outline" size={16} color={isDarkMode ? '#FFFFFF' : BRAND} style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, isDarkMode && { color: '#FFFFFF' }]}>Export PDF</Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />

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
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Voice recorder visibility state
  const [showVoiceModal, setShowVoiceModal]     = useState(false);

  // New Note creation modal state
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle]         = useState('');
  const [isCreating, setIsCreating]             = useState(false);

  useEffect(() => {
    if (params?.action === 'newNote') {
      handleCreateNewNote();
      router.setParams({ action: '' });
    }
  }, [params?.action]);

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
    return () => sub.remove();
  }, []);

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
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{font-family:-apple-system,Helvetica,sans-serif;padding:40px;color:#0f172a}
          h1{color:#4a6c8c;font-size:26px;margin-bottom:4px}
          .meta{color:#94a3b8;font-size:12px;margin-bottom:24px}
          .badge{display:inline-block;background:#4a6c8c18;color:#4a6c8c;font-size:11px;padding:2px 8px;border-radius:99px;margin-bottom:16px}
          .label{font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;margin-top:24px;margin-bottom:8px}
          p{font-size:15px;line-height:1.7;white-space:pre-wrap}
        </style></head><body>
        <div class="badge">${note.note_type === 'voice' ? '🎙 Voice Note' : '📄 Note'}</div>
        <h1>${note.title || 'Untitled'}</h1>
        <div class="meta">Exported ${new Date().toLocaleDateString()} · Focalyst</div>
        ${note.note_type === 'voice' && note.content ? `<div class="label">✨ AI Summary</div><p>${note.content}</p>` : ''}
        ${note.note_type === 'voice' && note.transcript ? `<div class="label">📝 Transcript</div><p>${note.transcript}</p>` : `<p>${note.content || ''}</p>`}
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
      <View style={[styles.loadingContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={[styles.loadingText, isDarkMode && { color: '#8E95A9' }]}>Loading notes…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, isDarkMode && { backgroundColor: '#0B1021' }]}>
      {/* Search */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchContainer, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          <Ionicons name="search-outline" size={18} color={isDarkMode ? '#8E95A9' : TEXT_MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, isDarkMode && { color: '#FFFFFF' }]}
            placeholder={t('notes.searchPlaceholder')}
            placeholderTextColor={isDarkMode ? '#FFFFFF' : TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDarkMode ? '#8E95A9' : TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter pills - Evenly distributed layout */}
      <View style={styles.filterContainer}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          const label = f === 'All' ? t('notes.all') : f === 'Notes' ? t('notes.notes') : f === 'Favourite' ? t('notes.favourite') : t('notes.voiceNotes');
          const pillStyle = [
            styles.filterPill,
            isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' },
            isActive && (isDarkMode ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' } : styles.filterPillActive)
          ];
          const textStyle = [
            styles.filterPillText,
            isDarkMode && { color: '#8E95A9' },
            isActive && (isDarkMode ? { color: '#0B1021' } : styles.filterPillTextActive)
          ];
          return (
            <TouchableOpacity
              key={f}
              style={pillStyle}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={textStyle}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA row */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.newNoteBtn, { backgroundColor: BRAND, flex: 1 }]}
          onPress={handleCreateNewNote}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newNoteBtnText}>{t('notes.newNote')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.voiceNoteBtn,
            isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' },
            isVoiceNoteLocked && (isDarkMode ? { backgroundColor: '#1C2438', borderColor: '#222A41' } : styles.voiceNoteBtnLocked)
          ]}
          onPress={() => {
            if (isVoiceNoteLocked) {
              router.push('/paywall');
            } else {
              setShowVoiceModal(true);
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isVoiceNoteLocked ? 'lock-closed' : 'mic'}
            size={18}
            color={isVoiceNoteLocked ? (isDarkMode ? '#8E95A9' : TEXT_MUTED) : ACCENT}
          />
          <Text
            style={[
              styles.voiceNoteBtnText,
              isVoiceNoteLocked && (isDarkMode ? { color: '#8E95A9' } : styles.voiceNoteBtnTextLocked)
            ]}
          >
            {t('notes.voiceNotes')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes list */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={isDarkMode ? '#8E95A9' : TEXT_MUTED} />
            <Text style={[styles.emptyTitle, isDarkMode && { color: '#FFFFFF' }]}>No notes here</Text>
            <Text style={[styles.emptySubtitle, isDarkMode && { color: '#8E95A9' }]}>
              {activeFilter === 'All'
                ? 'Tap "New Note" to capture your first thought.'
                : `No ${activeFilter.toLowerCase()} found.`}
            </Text>
          </View>
        ) : (
          filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isDarkMode={isDarkMode}
              onPress={() => handleNotePress(note)}
              onToggleFav={() => handleToggleFav(note.id, note.is_favourite)}
              onDelete={() => handleDeleteNote(note.id)}
              onExportPdf={() => handleExportPdf(note)}
              onCopy={() => handleCopy(note)}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      
      {/* Voice Recorder Overlay Modal */}
      <VoiceNoteRecorderModal
        visible={showVoiceModal}
        isDarkMode={isDarkMode}
        onClose={() => setShowVoiceModal(false)}
        onSaveSuccess={(savedNote) => {
          setShowVoiceModal(false);
          fetchUserAndNotes();
          if (savedNote?.id) {
            router.push(`/note/${savedNote.id}`);
          }
        }}
        userId={userId}
        supabase={supabase}
      />

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
            style={[styles.newNoteModalCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}
          >
            {/* Icon */}
            <View style={[styles.newNoteModalIcon, isDarkMode && { backgroundColor: '#222A41' }]}>
              <Ionicons name="document-text" size={24} color={BRAND} />
            </View>

            {/* Title */}
            <Text style={[styles.newNoteModalTitle, isDarkMode && { color: '#FFFFFF' }]}>
              New document
            </Text>
            <Text style={[styles.newNoteModalSubtitle, isDarkMode && { color: '#8E95A9' }]}>
              Please name your new note
            </Text>

            {/* Input */}
            <TextInput
              style={[styles.newNoteModalInput, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41', color: '#FFFFFF' }]}
              placeholder="Untitled note…"
              placeholderTextColor={isDarkMode ? '#555E75' : TEXT_MUTED}
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
              autoFocus
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleConfirmCreateNote}
              selectionColor={isDarkMode ? '#FFFFFF' : BRAND}
            />

            {/* Buttons */}
            <View style={styles.newNoteModalBtnRow}>
              <TouchableOpacity
                style={[styles.newNoteModalCancelBtn, isDarkMode && { backgroundColor: '#222A41' }]}
                onPress={() => { setShowNewNoteModal(false); setNewNoteTitle(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.newNoteModalCancelText, isDarkMode && { color: '#8E95A9' }]}>Cancel</Text>
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

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG },
  loadingContainer:{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:     { color: TEXT_SEC, fontSize: 14 },

  // Search
  searchBarContainer: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  searchInput:     { flex: 1, color: TEXT_PRI, fontSize: 14 },

  // Filters - Restructured Scroll wrapper to ensure no stretching
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterPill:           { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  filterPillActive:     { backgroundColor: BRAND, borderColor: BRAND },
  filterPillText:       { fontSize: 13, fontWeight: '600', color: TEXT_SEC },
  filterPillTextActive: { color: '#ffffff' },

  // CTA
  ctaRow:         { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  newNoteBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND, borderRadius: 12, height: 44, gap: 6 },
  newNoteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  voiceNoteBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 12, height: 44, gap: 6, borderWidth: 1.5, borderColor: ACCENT },
  voiceNoteBtnText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  voiceNoteBtnLocked: { borderColor: BORDER, backgroundColor: '#f1f5f9' },
  voiceNoteBtnTextLocked: { color: TEXT_MUTED },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: TEXT_PRI },
  emptySubtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },

  // Note Card
  noteCard:        { backgroundColor: CARD, borderRadius: 16, marginBottom: 12, borderWidth: 1.5, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

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
