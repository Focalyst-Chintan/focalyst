import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { debounce } from 'lodash';
import NetInfo from '@react-native-community/netinfo';
import { processTranscriptWithAI } from '../../services/voiceNoteAI';

function cleanContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/<\/li>\s*<li>/g, '\n')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<\/?ul>/g, '')
    .replace(/<\/?ol>/g, '')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/^[ \t]+([*-]\s)/gm, '$1')
    .trim();
}

const getMarkdownStyles = (isDarkMode: boolean) => ({
  body: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 15,
    lineHeight: 23,
  },
  paragraph: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 12,
  },
  bullet_list: {
    marginVertical: 6,
  },
  list_item: {
    marginVertical: 4,
  },
  bullet_list_icon: {
    color: '#ed6c4c',
    fontSize: 15,
    lineHeight: 23,
  },
  bullet_list_content: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 15,
    lineHeight: 23,
  },
  ordered_list: {
    marginVertical: 6,
  },
  ordered_list_icon: {
    color: '#ed6c4c',
    fontSize: 15,
    lineHeight: 23,
  },
  ordered_list_content: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 15,
    lineHeight: 23,
  },
  strong: {
    color: isDarkMode ? '#ffffff' : '#000000',
    fontWeight: '700' as const,
  },
  em: {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#334155',
    fontStyle: 'italic' as const,
  },
  code_block: {
    backgroundColor: isDarkMode ? '#1c2633' : '#f1f5f9',
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    marginVertical: 6,
  },
  fence: {
    backgroundColor: isDarkMode ? '#1c2633' : '#f1f5f9',
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    marginVertical: 6,
  },
  code_inline: {
    backgroundColor: isDarkMode ? '#1c2633' : '#f1f5f9',
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: isDarkMode ? '#1c2633' : '#f1f5f9',
    borderColor: isDarkMode ? '#4a6c8c' : '#315472',
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
    borderRadius: 4,
    color: isDarkMode ? '#f8fafc' : '#0f172a',
  },
  heading1: {
    color: isDarkMode ? '#ffffff' : '#0f172a',
    fontWeight: '700' as const,
    fontSize: 22,
    marginBottom: 8,
    marginTop: 12,
  },
  heading2: {
    color: isDarkMode ? '#ffffff' : '#0f172a',
    fontWeight: '700' as const,
    fontSize: 18,
    marginBottom: 6,
    marginTop: 10,
  },
  heading3: {
    color: isDarkMode ? '#ffffff' : '#0f172a',
    fontWeight: '600' as const,
    fontSize: 16,
    marginBottom: 4,
    marginTop: 8,
  },
  hr: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0',
    height: 1,
    marginVertical: 12,
  },
});

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

// ─── Color Picker Palette ─────────────────────────────────────────────────
const COLOR_SWATCHES = [
  { label: 'Black',   hex: '#000000' },
  { label: 'White',   hex: '#FFFFFF' },
  { label: 'Red',     hex: '#EF4444' },
  { label: 'Orange',  hex: '#F97316' },
  { label: 'Yellow',  hex: '#EAB308' },
  { label: 'Green',   hex: '#22C55E' },
  { label: 'Blue',    hex: '#3B82F6' },
  { label: 'Purple',  hex: '#A855F7' },
  { label: 'Pink',    hex: '#EC4899' },
  { label: 'Teal',    hex: '#14B8A6' },
];

const HIGHLIGHT_SWATCHES = [
  { label: 'None',          hex: 'transparent' },
  { label: 'Yellow',        hex: '#FEF08A' },
  { label: 'Green',         hex: '#BBF7D0' },
  { label: 'Blue',          hex: '#BFDBFE' },
  { label: 'Pink',          hex: '#FBCFE8' },
  { label: 'Orange',        hex: '#FED7AA' },
];

const PRESET_COLORS = ['#000000', '#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#FF9500', '#AF52DE'];

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;      // Gemini summary for voice, body text for standard notes
  transcript?: string | null;   // Raw audio transcription for voice notes
  note_type: 'text' | 'voice';
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const richText = useRef<RichEditor>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);

  // Voice viewer fields
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);

  // ─── Save status indicator ──────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');

  // ─── Color picker state ─────────────────────────────────────────────────
  const [activePicker, setActivePicker] = useState<'text' | 'highlight' | null>(null);

  // ─── Draft key for AsyncStorage ─────────────────────────────────────────
  const draftKey = `@note_draft_${id}`;

  useEffect(() => {
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

    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    return () => sub.remove();
  }, []);

  // ─── STEP 5: Background Sync Recovery ───────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        try {
          const localDraft = await AsyncStorage.getItem(draftKey);
          if (localDraft) {
            const { error } = await supabase
              .from('notes')
              .update({ content: localDraft, updated_at: new Date().toISOString() })
              .eq('id', id);
            if (!error) {
              await AsyncStorage.removeItem(draftKey);
              setSaveStatus('saved');

            }
          }
        } catch (e) {
          console.warn('Background sync failed:', e);
        }
      }
    });
    return () => unsubscribe();
  }, [id, draftKey]);

  // ─── STEP 5: Initial Load — local-first ─────────────────────────────────
  useEffect(() => {
    if (id) {
      loadNoteLocalFirst();
    }
  }, [id]);

  async function loadNoteLocalFirst() {
    try {
      setLoading(true);

      // Phase A: Check local draft first
      const localDraft = await AsyncStorage.getItem(draftKey);

      // Phase B: Fetch from Supabase
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        const fetched = data as Note;
        setNote(fetched);
        setNoteTitle(fetched.title || '');
        setIsFavourite(fetched.is_favourite || false);

        // Use local draft if it exists, otherwise use cloud content
        if (localDraft) {
          setNoteContent(localDraft);
          setSaveStatus('offline');
        } else {
          setNoteContent(fetched.content || '');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load note');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  // ─── STEP 4: Offline-First Storage Engine ───────────────────────────────
  const syncNoteToStorageAndCloud = useCallback(async (htmlContent: string) => {
    try {
      // Phase A: Local First — immediately persist to AsyncStorage
      await AsyncStorage.setItem(draftKey, htmlContent);
      setSaveStatus('saving');

      // Phase B: Network Check
      const netState = await NetInfo.fetch();

      // Phase C: Cloud Sync
      if (netState.isConnected) {
        const { error } = await supabase
          .from('notes')
          .update({ content: htmlContent, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) {
          // Success — remove local draft, it's synced
          await AsyncStorage.removeItem(draftKey);
          setSaveStatus('saved');
        } else {
          // Cloud save failed, but local draft is safe
          setSaveStatus('offline');
          console.warn('Cloud sync failed, draft saved locally:', error.message);
        }
      } else {
        // No connection — data is safe in AsyncStorage
        setSaveStatus('offline');
      }
    } catch (e) {
      console.warn('syncNoteToStorageAndCloud error:', e);
      setSaveStatus('offline');
    }
  }, [id, draftKey]);

  // ─── STEP 3: Debounced Auto-Save ────────────────────────────────────────
  const debouncedSave = useMemo(
    () =>
      debounce(async (htmlContent: string) => {
        await syncNoteToStorageAndCloud(htmlContent);
      }, 1500),
    [syncNoteToStorageAndCloud]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // ─── Title debounced save ───────────────────────────────────────────────
  const debouncedTitleSave = useMemo(
    () =>
      debounce(async (title: string) => {
        try {
          setSaveStatus('saving');
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            await supabase
              .from('notes')
              .update({ title: title.trim(), updated_at: new Date().toISOString() })
              .eq('id', id);
            setSaveStatus('saved');
          } else {
            setSaveStatus('offline');
          }
        } catch (e) {
          console.warn('Title auto-save failed:', e);
          setSaveStatus('offline');
        }
      }, 1500),
    [id]
  );

  useEffect(() => {
    return () => {
      debouncedTitleSave.cancel();
    };
  }, [debouncedTitleSave]);

  // ─── Editor change handler ──────────────────────────────────────────────
  const handleEditorChange = useCallback((html: string) => {
    setNoteContent(html);
    debouncedSave(html);
  }, [debouncedSave]);

  async function handleSave() {
    if (!noteTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the latest HTML content from the editor
      let currentContent = noteContent;
      if (richText.current) {
        try {
          const html = await richText.current.getContentHtml();
          if (html !== undefined && html !== null) {
            currentContent = html;
          }
        } catch (e) {
          // Fall back to state content
        }
      }

      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        title: noteTitle.trim(),
        content: currentContent,
        is_favourite: isFavourite,
        note_type: note?.note_type || 'text',
        updated_at: now,
      };

      let query;
      if (id === 'new') {
        query = supabase.from('notes').insert([{ ...payload, created_at: now }]);
      } else {
        query = supabase.from('notes').update(payload).eq('id', id);
      }

      const { error } = await query;
      if (error) throw error;

      // Clear any local draft on successful manual save
      await AsyncStorage.removeItem(draftKey);
      setSaveStatus('saved');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFavorite() {
    const nextVal = !isFavourite;
    setIsFavourite(nextVal);
    try {
      await supabase
        .from('notes')
        .update({ is_favourite: nextVal })
        .eq('id', id);
    } catch (e) {
      console.warn('Could not sync favorite toggle with Supabase');
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Note', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) throw error;
            // Also clear any local draft
            await AsyncStorage.removeItem(draftKey);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not delete note');
          }
        },
      },
    ]);
  }

  async function copyText(text: string) {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied ✓', 'Text copied to clipboard');
    } catch {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  }

  async function handleExportPdf() {
    if (!note) return;
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
        <h1>${noteTitle || 'Untitled'}</h1>
        <div class="meta">Exported ${new Date().toLocaleDateString()} · Focalyst</div>
        ${note.note_type === 'voice' ? `<div class="label">✨ AI Summary</div><p>${noteContent}</p>` : ''}
        ${note.note_type === 'voice' && note.transcript ? `<div class="label">📝 Transcript</div><p>${note.transcript}</p>` : `<p>${noteContent}</p>`}
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${noteTitle}.pdf` });
      } else {
        Alert.alert('PDF Saved', uri);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export PDF');
    }
  }

  // ─── Color picker action handlers ───────────────────────────────────────
  const handleTextColor = (hex: string) => {
    const currentEditor = richText.current as any;
    if (currentEditor?.setContentColor) {
      currentEditor.setContentColor(hex);
    } else {
      currentEditor?.setForeColor(hex);
    }
    setActivePicker(null);
  };

  const handleHighlightColor = (hex: string) => {
    if (hex === 'transparent') {
      richText.current?.setHiliteColor('transparent');
    } else {
      richText.current?.setHiliteColor(hex);
    }
    setActivePicker(null);
  };

  // ─── Save status label ─────────────────────────────────────────────────
  const renderSaveStatus = () => {
    let text = '';
    let color = isDarkMode ? '#555E75' : TEXT_MUTED;
    switch (saveStatus) {
      case 'saving':
        text = 'Saving…';
        color = isDarkMode ? '#8E95A9' : TEXT_SEC;
        break;
      case 'saved':
        text = '✓ Saved';
        color = '#22C55E';
        break;
      case 'offline':
        text = '↻ Saved offline';
        color = '#F97316';
        break;
      default:
        return null;
    }
    return <Text style={[styles.saveStatusText, { color }]}>{text}</Text>;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={[styles.loadingText, isDarkMode && { color: '#8E95A9' }]}>Loading note…</Text>
      </View>
    );
  }

  if (!note) return null;

  const isVoice = note.note_type === 'voice';

  // Rich editor custom CSS for dark mode / light mode
  const editorCSS = isDarkMode
    ? `body { background-color: #0B1021; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; line-height: 1.6; padding: 4px 0; min-height: 100vh; padding-bottom: 120px; } h1, h2, h3 { color: #FFFFFF; } a { color: #4a6c8c; } code { background-color: #222A41; color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; } ul, ol { padding-left: 20px; } blockquote { border-left: 3px solid #4a6c8c; padding-left: 12px; color: #8E95A9; }`
    : `body { background-color: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; line-height: 1.6; padding: 4px 0; min-height: 100vh; padding-bottom: 120px; } h1, h2, h3 { color: #0f172a; } a { color: #4a6c8c; } code { background-color: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 13px; } ul, ol { padding-left: 20px; } blockquote { border-left: 3px solid #4a6c8c; padding-left: 12px; color: #64748b; }`;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: '#0B1021' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, isDarkMode && { backgroundColor: '#0B1021', borderBottomColor: '#222A41' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={isDarkMode ? '#FFFFFF' : BRAND} />
          <Text style={[styles.backLabel, isDarkMode && { color: '#FFFFFF' }]}>Notes</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          {isVoice ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="mic" size={15} color={ACCENT} />
              <Text style={[styles.headerTitle, isDarkMode && { color: '#FFFFFF' }]}>Voice Note</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.headerTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>{noteTitle || 'Untitled'}</Text>
              {renderSaveStatus()}
            </>
          )}
        </View>

        <View style={styles.headerRight}>
          {!isVoice && (
            <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 14 }}>
              <Ionicons name="checkmark" size={24} color={isDarkMode ? '#FFFFFF' : BRAND} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleToggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavourite ? '#ff6b2b' : (isDarkMode ? '#8E95A9' : '#4a6c8c')}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 14 }}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {isVoice ? (
        /* Voice Note Viewer */
        <View style={{ flex: 1 }}>
          <View style={[styles.voiceTitleEditContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
            <TextInput
              style={[styles.voiceTitleEditInput, isDarkMode && { color: '#FFFFFF' }]}
              value={noteTitle}
              onChangeText={(txt) => {
                setNoteTitle(txt);
                supabase.from('notes').update({ title: txt }).eq('id', id).then(
                  ({ error }) => { if (error) console.warn('Auto-save failed:', error.message); }
                );
              }}
              placeholder="Voice Note Title"
              placeholderTextColor={isDarkMode ? '#8E95A9' : TEXT_MUTED}
              selectionColor={isDarkMode ? '#FFFFFF' : BRAND}
            />
            <View style={[styles.titleDivider, isDarkMode && { backgroundColor: '#222A41' }]} />
          </View>

          {/* Tab & Copy Action Row - Perfect Alignment */}
          <View style={styles.tabActionRow}>
            <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? '#16202c' : '#e2e8f0' }]}>
              {(['summary', 'transcript'] as const).map(tab => {
                const isActive = activeTab === tab;
                const tabStyle = [
                  styles.tab,
                  isActive && {
                    backgroundColor: isDarkMode ? '#222f3e' : '#ffffff',
                  }
                ];
                const tabTextStyle = [
                  styles.tabText,
                  {
                    color: isActive ? (isDarkMode ? '#ffffff' : '#0f172a') : '#94a3b8',
                    fontWeight: isActive ? ('600' as const) : ('500' as const),
                  }
                ];
                return (
                  <TouchableOpacity
                    key={tab}
                    style={tabStyle}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={tabTextStyle} numberOfLines={1}>
                      {tab === 'summary' ? 'Summary' : 'Transcript'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.inlineCopyBtn}
              onPress={() => copyText(activeTab === 'summary' ? noteContent : note?.transcript || '')}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={14} color="#fff" />
              <Text style={styles.inlineCopyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'summary' ? (
              <Markdown style={getMarkdownStyles(isDarkMode)}>
                {cleanContent(noteContent) || '*No AI summary available.*'}
              </Markdown>
            ) : (
              <TextInput
                style={[
                  styles.contentText,
                  { minHeight: 200, textAlignVertical: 'top' },
                  isDarkMode && { color: 'rgba(255, 255, 255, 0.9)' }
                ]}
                multiline
                value={note?.transcript || ''}
                onChangeText={(txt) => {
                  setNote(prev => prev ? { ...prev, transcript: txt } : null);
                  supabase.from('notes').update({ transcript: txt, updated_at: new Date().toISOString() }).eq('id', id).then();
                }}
                placeholder="No transcript available. Tap to type or paste transcript..."
                placeholderTextColor={isDarkMode ? '#8E95A9' : TEXT_MUTED}
              />
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer - Export PDF stretched */}
          <View style={[styles.footer, isDarkMode && { backgroundColor: '#0B1021', borderTopColor: '#222A41' }]}>
            <TouchableOpacity
              style={[styles.exportBtn, isDarkMode && { borderColor: '#222A41', backgroundColor: '#151B2E' }]}
              onPress={handleExportPdf}
              activeOpacity={0.8}
            >
              <Ionicons name="document-outline" size={16} color={isDarkMode ? '#FFFFFF' : BRAND} />
              <Text style={[styles.exportBtnText, isDarkMode && { color: '#FFFFFF' }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Standard Text Note Editor — Rich Text with KeyboardAvoidingView */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Title Input */}
          <View style={[styles.editorTitleContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
            <TextInput
              style={[styles.editorTitleInput, isDarkMode && { color: '#FFFFFF' }]}
              placeholder="Note title…"
              placeholderTextColor={isDarkMode ? '#8E95A9' : TEXT_MUTED}
              value={noteTitle}
              onChangeText={(txt) => {
                setNoteTitle(txt);
                debouncedTitleSave(txt);
              }}
              maxLength={100}
              selectionColor={isDarkMode ? '#FFFFFF' : BRAND}
            />
            <View style={[styles.editorDivider, isDarkMode && { backgroundColor: '#222A41' }]} />
          </View>

          {/* ScrollView wrapping RichEditor */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 150, paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <RichEditor
              ref={richText}
              style={styles.richEditor}
              editorStyle={{
                backgroundColor: isDarkMode ? '#0B1021' : BG,
                color: isDarkMode ? '#FFFFFF' : TEXT_PRI,
                placeholderColor: isDarkMode ? '#555E75' : TEXT_MUTED,
                contentCSSText: editorCSS,
                initialCSSText: "body { min-height: 100vh; padding-bottom: 120px; }",
              }}
              placeholder="Start writing your thoughts…"
              initialContentHTML={noteContent}
              onChange={handleEditorChange}
              useContainer={true}
              initialHeight={400}
              {...{ androidHardwareAccelerationDisabled: true } as any}
            />
          </ScrollView>

          {/* ─── Color Picker Tray (shown above toolbar) ──────────────── */}
          {activePicker !== null && (
            <View style={[
              styles.colorPickerContainer,
              isDarkMode && { backgroundColor: '#1A2035', borderTopColor: '#2A3350' }
            ]}>
              {/* Title indicator for current mode */}
              <View style={styles.colorModeToggle}>
                <View
                  style={[
                    styles.colorModeBtn,
                    { backgroundColor: isDarkMode ? '#2A3350' : '#E0E4EB' },
                  ]}
                >
                  <Ionicons
                    name={activePicker === 'text' ? "text" : "brush"}
                    size={14}
                    color={isDarkMode ? '#FFFFFF' : BRAND}
                  />
                  <Text style={[styles.colorModeLabel, { color: isDarkMode ? '#FFFFFF' : BRAND }]}>
                    {activePicker === 'text' ? "Text Color" : "Highlight Color"}
                  </Text>
                </View>
              </View>

              {/* Preset Swatches ScrollView */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingVertical: 10 }}
                keyboardShouldPersistTaps="always"
              >
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: color,
                      marginHorizontal: 12,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#2A3350' : '#ddd',
                    }}
                    onPress={() => {
                      richText.current?.focusContentEditor();
                      setTimeout(() => {
                        if (activePicker === 'text') {
                          richText.current?.injectJavascript(`document.execCommand('foreColor', false, '${color}');`);
                        }
                        if (activePicker === 'highlight') {
                          richText.current?.injectJavascript(`document.execCommand('hiliteColor', false, '${color}');`);
                          richText.current?.injectJavascript(`document.execCommand('backColor', false, '${color}');`);
                        }
                        setActivePicker(null);
                      }, 50);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── STEP 2: Apple-Style RichToolbar ─────────────────────── */}
          <RichToolbar
            editor={richText}
            getEditor={() => richText.current}
            style={[
              styles.richToolbar,
              isDarkMode && { backgroundColor: '#1A2035', borderTopColor: '#2A3350' },
            ]}
            flatContainerStyle={styles.toolbarFlatContainer}
            iconTint={isDarkMode ? '#8E95A9' : TEXT_SEC}
            selectedIconTint={isDarkMode ? '#FFFFFF' : BRAND}
            selectedButtonStyle={{
              backgroundColor: isDarkMode ? '#2A3350' : '#E8F0FE',
              borderRadius: 6,
            }}
            actions={[
              actions.undo,
              actions.redo,
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.setStrikethrough,
              actions.heading1,
              actions.checkboxList,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.indent,
              actions.outdent,
              actions.alignLeft,
              actions.alignCenter,
              actions.alignRight,
              actions.alignFull,
              'textColor',
              'highlightColor',
            ]}
            iconMap={{
              textColor: ({ tintColor }: { tintColor: string }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: activePicker === 'text' ? (isDarkMode ? '#FFFFFF' : BRAND) : tintColor, lineHeight: 16 }}>A</Text>
                  <View style={{ width: 14, height: 2, backgroundColor: activePicker === 'text' ? (isDarkMode ? '#FFFFFF' : BRAND) : tintColor, marginTop: 1 }} />
                </View>
              ),
              highlightColor: ({ tintColor }: { tintColor: string }) => (
                <Ionicons name="brush" size={19} color={activePicker === 'highlight' ? (isDarkMode ? '#FFFFFF' : BRAND) : tintColor} />
              ),
            }}
            textColor={() => setActivePicker(activePicker === 'text' ? null : 'text')}
            highlightColor={() => setActivePicker(activePicker === 'highlight' ? null : 'highlight')}
            {...{
              customAction: (action: string) => {
                if (action === 'textColor') setActivePicker('text');
                if (action === 'highlightColor') setActivePicker('highlight');
              }
            } as any}
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: TEXT_SEC,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  backLabel: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRI,
    maxWidth: 140,
  },
  saveStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // Voice note styling
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  aiBadgeText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },
  voiceTitleEditContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  voiceTitleEditInput: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: TEXT_PRI,
    paddingBottom: 4,
  },
  titleDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  tabActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    borderRadius: 999,
    backgroundColor: '#16202c',
    padding: 4,
    alignItems: 'center',
    marginRight: 12,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#222f3e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inlineCopyBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#ed6c4c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineCopyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  contentText: {
    fontSize: 15,
    color: TEXT_PRI,
    lineHeight: 25,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD,
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 16,
  },
  exportBtnText: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '600',
  },
  // Text Editor styling
  editorTitleContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: BG,
  },
  editorTitleInput: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: TEXT_PRI,
    paddingBottom: 4,
  },
  editorDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  // Rich Editor
  richEditor: {
    flex: 1,
    minHeight: 300,
  },
  // ─── Apple-Style Rich Toolbar ───────────────────────────────────────────
  richToolbar: {
    backgroundColor: '#D1D3D9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B8BBC2',
    height: 44,
    elevation: 0,
    shadowOpacity: 0,
  },
  toolbarFlatContainer: {
    paddingHorizontal: 4,
    gap: 2,
  },
  // ─── Color Picker ──────────────────────────────────────────────────────
  colorPickerContainer: {
    backgroundColor: '#EFF1F5',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B8BBC2',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colorModeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  colorModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  colorModeBtnActive: {
    backgroundColor: '#E0E4EB',
  },
  colorModeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SEC,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  swatchTransparent: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  colorIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
