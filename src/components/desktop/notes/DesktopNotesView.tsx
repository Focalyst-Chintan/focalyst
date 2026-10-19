'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Note } from '@/types';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/context/AuthContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import { createClient } from '@/lib/supabase';
import FolderPocketCard from './FolderPocketCard';
import DesktopNoteEditor from './DesktopNoteEditor';
import VoiceRecorderModal from './VoiceRecorderModal';
import { stripHtml } from './noteUtils';
import {
  FileText,
  Star,
  Pin,
  Mic,
  Folder as FolderIcon,
  Search,
  Plus,
  ArrowUpDown,
  ChevronRight,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';
import { Input } from '@/components/desktop/ui/Input';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { Kbd } from '@/components/desktop/ui/Kbd';

type FilterTab = 'all' | 'pinned' | 'favourites' | 'voice' | 'folders';
type SortOption = 'updated' | 'created' | 'title';

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function DesktopNotesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createClient();
  const create = useCreate();

  const noteIdParam = searchParams.get('id');
  const filterParam = (searchParams.get('filter') as FilterTab) || 'all';
  const folderParam = searchParams.get('folder');

  const {
    notes,
    loading,
    error,
    fetchNotes,
    deleteNote,
    toggleFavourite,
    togglePin,
    updateNote,
  } = useNotes(user?.id);

  const [activeFilter, setActiveFilter] = useState<FilterTab>(filterParam);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(folderParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('updated');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL params
  useEffect(() => {
    if (filterParam) setActiveFilter(filterParam);
    if (folderParam !== undefined) setSelectedFolder(folderParam);
  }, [filterParam, folderParam]);

  // Initial load & data event listener
  useEffect(() => {
    if (user?.id) {
      fetchNotes(1, 100);
    }
    const unsub = onDataChanged(['note'], () => {
      if (user?.id) fetchNotes(1, 100);
    });
    return unsub;
  }, [user?.id, fetchNotes]);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const target = e.target as HTMLElement;
        const tagName = target?.tagName?.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Distinct folders list
  const existingFolders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.folder && n.folder.trim()) set.add(n.folder.trim());
    });
    return Array.from(set).sort();
  }, [notes]);

  // Filter notes based on activeFilter, selectedFolder, and searchQuery
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    if (activeFilter === 'pinned') {
      list = list.filter((n) => n.is_pinned);
    } else if (activeFilter === 'favourites') {
      list = list.filter((n) => n.is_favourite);
    } else if (activeFilter === 'voice') {
      list = list.filter((n) => n.note_type === 'voice' || n.audio_url || n.transcript);
    }

    if (selectedFolder) {
      list = list.filter((n) => n.folder === selectedFolder);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q))
      );
    }

    // Sort list
    list.sort((a, b) => {
      if (sortOption === 'updated') {
        const tA = new Date(a.updated_at || a.created_at).getTime();
        const tB = new Date(b.updated_at || b.created_at).getTime();
        return tB - tA;
      }
      if (sortOption === 'created') {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return tB - tA;
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    return list;
  }, [notes, activeFilter, selectedFolder, searchQuery, sortOption]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.is_pinned), [filteredNotes]);
  const regularNotes = useMemo(() => filteredNotes.filter((n) => !n.is_pinned), [filteredNotes]);

  // Selected note
  const currentNote = useMemo(() => {
    if (!notes.length) return null;
    if (noteIdParam) {
      const match = notes.find((n) => n.id === noteIdParam);
      if (match) return match;
    }
    // If no param or invalid param, return first note if not in folder-overview mode
    if (activeFilter !== 'folders' && filteredNotes.length > 0) {
      return filteredNotes[0];
    }
    return null;
  }, [notes, noteIdParam, activeFilter, filteredNotes]);

  const selectNote = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('id', id);
      router.push(`/notes?${params.toString()}`);
    },
    [router, searchParams]
  );

  const selectFilter = useCallback(
    (tab: FilterTab) => {
      setActiveFilter(tab);
      setSelectedFolder(null);
      const params = new URLSearchParams();
      params.set('filter', tab);
      router.push(`/notes?${params.toString()}`);
    },
    [router]
  );

  const selectFolder = useCallback(
    (folderName: string | null) => {
      setSelectedFolder(folderName);
      const params = new URLSearchParams();
      if (folderName) {
        params.set('folder', folderName);
      }
      params.set('filter', 'all');
      router.push(`/notes?${params.toString()}`);
    },
    [router]
  );

  const handleCreateNewNote = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: '',
          content: '',
          folder: selectedFolder || null,
        })
        .select()
        .single();

      if (error) throw error;
      emitDataChanged('note');
      if (data) {
        router.push(`/notes?id=${data.id}${selectedFolder ? `&folder=${encodeURIComponent(selectedFolder)}` : ''}`);
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    emitDataChanged('note');
    const remaining = notes.filter((n) => n.id !== id);
    if (remaining.length > 0) {
      selectNote(remaining[0].id);
    } else {
      router.push('/notes');
    }
  };

  const handleFolderChange = async (id: string, folder: string | null) => {
    await updateNote(id, { folder });
    emitDataChanged('note');
  };

  const handleTogglePinNote = async (n: Note) => {
    await togglePin(n.id, n.is_pinned);
    emitDataChanged('note');
  };

  const handleToggleFavNote = async (n: Note) => {
    await toggleFavourite(n.id, n.is_favourite);
    emitDataChanged('note');
  };

  const handleSaveAudio = async (blob: Blob, durationSec: number) => {
    if (!user) return;
    try {
      // 1. Upload audio file to Supabase storage 'notes-audio'
      const filename = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('notes-audio')
        .upload(filename, blob, { contentType: 'audio/webm' });

      let audioUrl = '';
      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('notes-audio')
          .getPublicUrl(filename);
        audioUrl = publicUrlData?.publicUrl || '';
      }

      // 2. Call /api/ai/summarize-voice
      const res = await fetch('/api/ai/summarize-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: '',
          durationSeconds: durationSec,
          audioUrl,
        }),
      });

      emitDataChanged('note');
      fetchNotes(1, 100);
    } catch (err) {
      console.error('Audio upload failed:', err);
    }
  };

  if (loading && notes.length === 0) {
    return (
      <div className="grid grid-cols-[220px_320px_1fr] gap-4 h-[calc(100vh-112px)]">
        <div className="frost rounded-[20px] p-3.5 space-y-3">
          <Skeleton className="h-10 w-full rounded-[12px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
        </div>
        <div className="frost rounded-[20px] p-3.5 space-y-3">
          <Skeleton className="h-10 w-full rounded-[12px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
        </div>
        <div className="frost rounded-[28px] p-8 flex flex-col justify-center items-center">
          <Skeleton className="h-10 w-64 rounded-[12px] mb-4" />
          <Skeleton className="h-40 w-full max-w-[600px] rounded-[16px]" />
        </div>
      </div>
    );
  }

  const folderNoteCount = selectedFolder
    ? notes.filter((n) => n.folder === selectedFolder).length
    : currentNote?.folder
    ? notes.filter((n) => n.folder === currentNote.folder).length
    : notes.length;

  return (
    <div className="grid grid-cols-[220px_320px_1fr] gap-4 h-[calc(100vh-112px)]">
      {/* PANE 1: Navigation, Filters, Folders (220px) */}
      <div className="frost rounded-[20px] p-3.5 flex flex-col overflow-hidden shrink-0">
        {/* Top Action */}
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center shadow-md mb-4"
          onClick={handleCreateNewNote}
        >
          <Plus size={16} />
          <span>New note</span>
        </Button>

        {/* Filters */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectFilter('all')}
            className={`w-full h-9 rounded-[12px] px-3 flex items-center justify-between text-[14px] font-medium transition-colors ${
              activeFilter === 'all' && !selectedFolder
                ? 'fx-active-pill text-ink'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-ink-3" />
              <span>All</span>
            </div>
            <span className="text-[12px] tabular-nums text-ink-3">{notes.length}</span>
          </button>

          <button
            type="button"
            onClick={() => selectFilter('pinned')}
            className={`w-full h-9 rounded-[12px] px-3 flex items-center justify-between text-[14px] font-medium transition-colors ${
              activeFilter === 'pinned'
                ? 'fx-active-pill text-ink'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <Pin size={16} className="text-ink-3" />
              <span>Pinned</span>
            </div>
            <span className="text-[12px] tabular-nums text-ink-3">
              {notes.filter((n) => n.is_pinned).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectFilter('favourites')}
            className={`w-full h-9 rounded-[12px] px-3 flex items-center justify-between text-[14px] font-medium transition-colors ${
              activeFilter === 'favourites'
                ? 'fx-active-pill text-ink'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star size={16} className="text-ink-3" />
              <span>Favourites</span>
            </div>
            <span className="text-[12px] tabular-nums text-ink-3">
              {notes.filter((n) => n.is_favourite).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectFilter('voice')}
            className={`w-full h-9 rounded-[12px] px-3 flex items-center justify-between text-[14px] font-medium transition-colors ${
              activeFilter === 'voice'
                ? 'fx-active-pill text-ink'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-ink-3" />
              <span>Voice notes</span>
            </div>
            <span className="text-[12px] tabular-nums text-ink-3">
              {notes.filter((n) => n.note_type === 'voice' || n.audio_url || n.transcript).length}
            </span>
          </button>
        </div>

        {/* Folders Section */}
        <div className="mt-6 flex-1 flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => selectFilter('folders')}
            className={`w-full h-8 px-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors ${
              activeFilter === 'folders' ? 'text-primary font-semibold' : ''
            }`}
          >
            <span>FOLDERS</span>
            <span className="text-[10px] tabular-nums lowercase">Overview ›</span>
          </button>

          {/* Indented Folders Tree */}
          <div className="mt-2 ml-3 border-l border-line-strong pl-2.5 space-y-1 overflow-y-auto flex-1">
            {existingFolders.map((f) => {
              const count = notes.filter((n) => n.folder === f).length;
              const isSelected = selectedFolder === f && activeFilter !== 'folders';
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => selectFolder(f)}
                  className={`w-full h-8 rounded-[10px] px-2.5 flex items-center justify-between text-[13px] transition-colors truncate text-left ${
                    isSelected
                      ? 'bg-primary-soft text-primary-text font-medium'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="truncate">{f}</span>
                  <span className="text-[11px] tabular-nums text-ink-3 ml-1 shrink-0">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Ghost + New Folder Button */}
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="mt-2 w-full h-8 px-2 flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-ink hover:bg-surface-2 rounded-[10px] transition-colors"
          >
            <FolderPlus size={14} />
            <span>New folder</span>
          </button>
        </div>
      </div>

      {/* PANE 2: Search, Sort & Notes List (320px) */}
      <div className="frost rounded-[20px] p-3.5 flex flex-col overflow-hidden shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Input
            ref={searchInputRef}
            placeholder="Search notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={15} />}
            rightIcon={<Kbd className="text-[10px]">/</Kbd>}
            className="h-9 text-[13px]"
          />
        </div>

        {/* Sub-row: Sort dropdown & Mic IconButton */}
        <div className="mt-2.5 pb-2 border-b border-line flex items-center justify-between">
          <Popover
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink font-medium px-1 py-1 rounded-[6px] transition-colors"
              >
                <ArrowUpDown size={13} className="text-ink-3" />
                <span>
                  {sortOption === 'updated'
                    ? 'Last edited'
                    : sortOption === 'created'
                    ? 'Created'
                    : 'Title'}
                </span>
              </button>
            }
          >
            {({ close }) => (
              <div className="p-1 w-36 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('updated');
                    close();
                  }}
                  className={`h-7 px-2 rounded-[6px] text-[12px] text-left transition-colors ${
                    sortOption === 'updated'
                      ? 'bg-primary-soft text-primary-text font-medium'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  Last edited
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('created');
                    close();
                  }}
                  className={`h-7 px-2 rounded-[6px] text-[12px] text-left transition-colors ${
                    sortOption === 'created'
                      ? 'bg-primary-soft text-primary-text font-medium'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  Created
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('title');
                    close();
                  }}
                  className={`h-7 px-2 rounded-[6px] text-[12px] text-left transition-colors ${
                    sortOption === 'title'
                      ? 'bg-primary-soft text-primary-text font-medium'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  Title
                </button>
              </div>
            )}
          </Popover>

          <IconButton
            label="Record voice note"
            size="sm"
            variant="ghost"
            onClick={() => setIsVoiceModalOpen(true)}
          >
            <Mic size={15} className="text-ink-2 hover:text-primary" />
          </IconButton>
        </div>

        {/* Scrollable list grouped into PINNED and ALL NOTES */}
        <div className="mt-2 flex-1 overflow-y-auto space-y-1">
          {pinnedNotes.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                PINNED
              </div>
              <div className="space-y-1">
                {pinnedNotes.map((n) => {
                  const isSelected = currentNote?.id === n.id;
                  const preview = stripHtml(n.content);
                  const isVoice = n.note_type === 'voice' || n.audio_url || n.transcript;
                  return (
                    <div
                      key={n.id}
                      onClick={() => selectNote(n.id)}
                      className={`relative p-3 rounded-[14px] cursor-pointer transition-all border border-transparent ${
                        isSelected
                          ? 'bg-surface-2 border-primary/20 shadow-sm'
                          : 'hover:bg-surface-2/60'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r" />
                      )}
                      <div className="text-[14px] font-semibold text-ink truncate">
                        {n.title || 'Untitled'}
                      </div>
                      <div className="text-[13px] text-ink-2 line-clamp-2 mt-0.5">
                        {preview || 'No content'}
                      </div>
                      <div className="text-[11px] text-ink-3 tabular-nums flex items-center gap-1.5 mt-1.5">
                        {isVoice && <Mic size={12} className="text-primary" />}
                        <span>{formatRelativeDate(n.updated_at || n.created_at)}</span>
                        {n.folder && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[120px]">{n.folder}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            {pinnedNotes.length > 0 && (
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                ALL NOTES
              </div>
            )}
            {regularNotes.length === 0 && pinnedNotes.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ink-3">
                No notes found.
              </div>
            ) : (
              <div className="space-y-1">
                {regularNotes.map((n) => {
                  const isSelected = currentNote?.id === n.id;
                  const preview = stripHtml(n.content);
                  const isVoice = n.note_type === 'voice' || n.audio_url || n.transcript;
                  return (
                    <div
                      key={n.id}
                      onClick={() => selectNote(n.id)}
                      className={`relative p-3 rounded-[14px] cursor-pointer transition-all border border-transparent ${
                        isSelected
                          ? 'bg-surface-2 border-primary/20 shadow-sm'
                          : 'hover:bg-surface-2/60'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r" />
                      )}
                      <div className="text-[14px] font-semibold text-ink truncate">
                        {n.title || 'Untitled'}
                      </div>
                      <div className="text-[13px] text-ink-2 line-clamp-2 mt-0.5">
                        {preview || 'No content'}
                      </div>
                      <div className="text-[11px] text-ink-3 tabular-nums flex items-center gap-1.5 mt-1.5">
                        {isVoice && <Mic size={12} className="text-primary" />}
                        <span>{formatRelativeDate(n.updated_at || n.created_at)}</span>
                        {n.folder && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[120px]">{n.folder}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANE 3: Editor or Folder Grid Overview (1fr) */}
      <div className="frost rounded-[28px] flex flex-col overflow-hidden relative">
        {activeFilter === 'folders' ? (
          /* Kintsugi Folder Overview */
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Top Breadcrumb & Action */}
            <div className="flex items-center justify-between pb-6 border-b border-line mb-6">
              <div className="flex items-center gap-2 text-[14px] text-ink-2 font-medium">
                <button
                  type="button"
                  onClick={() => selectFilter('all')}
                  className="hover:text-ink transition-colors"
                >
                  Notes
                </button>
                <span>›</span>
                <span className="text-ink font-semibold">Folders</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewFolderModalOpen(true)}
              >
                <Plus size={14} />
                <span>New folder</span>
              </Button>
            </div>

            {/* Grid of FolderPocketCards */}
            <div className="grid grid-cols-3 gap-5">
              {/* All Notes card */}
              <FolderPocketCard
                name="All notes"
                noteCount={notes.length}
                previewText={
                  notes.length > 0
                    ? stripHtml(notes[0].content) || notes[0].title
                    : 'All captured notes across your workspace.'
                }
                active={selectedFolder === null}
                onClick={() => selectFolder(null)}
              />

              {/* Each user folder */}
              {existingFolders.map((f) => {
                const folderNotes = notes.filter((n) => n.folder === f);
                const latestText =
                  folderNotes.length > 0
                    ? stripHtml(folderNotes[0].content) || folderNotes[0].title
                    : undefined;
                return (
                  <FolderPocketCard
                    key={f}
                    name={f}
                    noteCount={folderNotes.length}
                    previewText={latestText}
                    active={selectedFolder === f}
                    onClick={() => selectFolder(f)}
                  />
                );
              })}
            </div>
          </div>
        ) : currentNote ? (
          /* Desktop Note Editor */
          <DesktopNoteEditor
            key={currentNote.id}
            note={currentNote}
            existingFolders={existingFolders}
            totalNotesCount={notes.length}
            folderNotesCount={folderNoteCount}
            onDeleteNote={handleDeleteNote}
            onFolderChange={handleFolderChange}
            onTogglePin={handleTogglePinNote}
            onToggleFavourite={handleToggleFavNote}
          />
        ) : notes.length === 0 ? (
          /* Workspace Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <EmptyState
              title="Your thoughts, organised."
              description="Capture notes, checklists and voice summaries in one calm place."
              actionLabel="New note"
              onAction={handleCreateNewNote}
            />
          </div>
        ) : (
          /* Notes exist but none selected: FolderPocketCard grid overview */
          <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-between">
            <div>
              <h3 className="font-display text-[24px] text-ink mb-4">Folders</h3>
              <div className="grid grid-cols-3 gap-5">
                <FolderPocketCard
                  name="All notes"
                  noteCount={notes.length}
                  previewText={notes.length > 0 ? stripHtml(notes[0].content) : undefined}
                  onClick={() => selectFolder(null)}
                />
                {existingFolders.map((f) => {
                  const folderNotes = notes.filter((n) => n.folder === f);
                  return (
                    <FolderPocketCard
                      key={f}
                      name={f}
                      noteCount={folderNotes.length}
                      previewText={folderNotes.length > 0 ? stripHtml(folderNotes[0].content) : undefined}
                      onClick={() => selectFolder(f)}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-center text-[14px] text-ink-3 py-6">
              Select a note or start a new one.
            </div>
          </div>
        )}
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        open={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveAudio={handleSaveAudio}
      />

      {/* New Folder Creation Modal */}
      <Modal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        size="sm"
        title="Create folder"
      >
        <div className="py-2">
          <Input
            label="Folder name"
            placeholder="e.g. Work, Ideas, Personal"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                selectFolder(newFolderName.trim());
                setNewFolderName('');
                setIsNewFolderModalOpen(false);
              }
            }}
          />
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsNewFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!newFolderName.trim()}
              onClick={() => {
                selectFolder(newFolderName.trim());
                setNewFolderName('');
                setIsNewFolderModalOpen(false);
              }}
            >
              Create folder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
