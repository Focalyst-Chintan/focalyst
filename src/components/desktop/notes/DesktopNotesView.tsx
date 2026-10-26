'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Note } from '@/types';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/context/AuthContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import { createClient } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import FolderPocketCard from './FolderPocketCard';
import { FolderCard } from './FolderCard';
import { stripHtml } from './noteUtils';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

const DesktopNoteEditor = dynamic(() => import('./DesktopNoteEditor'), {
  ssr: false,
  loading: () => <div className="flex-1 p-6"><div className="h-full w-full rounded-2xl bg-surface-2/40 animate-pulse" /></div>,
});

const VoiceRecorderModal = dynamic(() => import('./VoiceRecorderModal'), {
  ssr: false,
});
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
import { Tooltip } from '@/components/desktop/ui/Tooltip';
import { useToast } from '@/components/desktop/ui/Toast';

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

function noteHasText(content: unknown): boolean {
  if (!content) return false;
  if (typeof content === 'string') {
    const s = content.trim();
    if (s.startsWith('{') || s.startsWith('[')) { try { return noteHasText(JSON.parse(s)); } catch {} }
    return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
  }
  if (Array.isArray(content)) return content.some(noteHasText);
  if (typeof content === 'object') {
    const o = content as Record<string, unknown>;
    if (typeof o.text === 'string' && o.text.trim()) return true;
    return Object.values(o).some((v) => typeof v === 'object' && v !== null && noteHasText(v));
  }
  return false;
}

export default function DesktopNotesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createClient();
  const create = useCreate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const createdThisSession = useRef(new Set<string>());
  const prevSelected = useRef<string | null>(null);

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
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('updated');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setSearchQuery(val);
  }, 200);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    debouncedSearch.run(val);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL params
  useEffect(() => {
    if (filterParam) setActiveFilter(filterParam);
    if (folderParam !== undefined) setSelectedFolder(folderParam);
  }, [filterParam, folderParam]);

  // Initial load & data event listener
  useEffect(() => {
    if (user?.id) {
      fetchNotes(1, 30);
    }
    const unsub = onDataChanged(['note'], () => {
      if (user?.id) fetchNotes(1, 30);
    });
    return unsub;
  }, [user?.id, fetchNotes]);

  const [desktopNotesPage, setDesktopNotesPage] = useState(1);
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading) return;
    const el = desktopSentinelRef.current;
    if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setDesktopNotesPage((prev) => {
          const next = prev + 1;
          fetchNotes(next, 30);
          return next;
        });
      }
    }, { rootMargin: '200px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, fetchNotes]);

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

  // Folder overview search & sort state
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [folderSortOption, setFolderSortOption] = useState<'name' | 'updated' | 'count'>('name');

  // Distinct folders list
  const existingFolders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.folder && n.folder.trim()) set.add(n.folder.trim());
    });
    return Array.from(set).sort();
  }, [notes]);

  // Filtered and sorted folders for pane 3
  const displayedFolders = useMemo(() => {
    let list = existingFolders.filter((f) =>
      f.toLowerCase().includes(folderSearchQuery.trim().toLowerCase())
    );

    if (folderSortOption === 'count') {
      list.sort((a, b) => {
        const countA = notes.filter((n) => n.folder === a).length;
        const countB = notes.filter((n) => n.folder === b).length;
        return countB - countA;
      });
    } else if (folderSortOption === 'updated') {
      list.sort((a, b) => {
        const noteA = notes.find((n) => n.folder === a);
        const noteB = notes.find((n) => n.folder === b);
        const dateA = noteA ? new Date(noteA.updated_at || noteA.created_at).getTime() : 0;
        const dateB = noteB ? new Date(noteB.updated_at || noteB.created_at).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      list.sort((a, b) => a.localeCompare(b));
    }

    return list;
  }, [existingFolders, folderSearchQuery, folderSortOption, notes]);

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

  const selectedNoteId = currentNote?.id ?? noteIdParam ?? null;

  useEffect(() => {
    const prev = prevSelected.current;
    prevSelected.current = selectedNoteId;
    if (!prev || prev === selectedNoteId || !createdThisSession.current.has(prev)) return;
    setTimeout(async () => {
      const { data } = await supabase.from('notes').select('title, content').eq('id', prev).maybeSingle();
      if (data && !String(data.title ?? '').trim() && !noteHasText(data.content)) {
        await supabase.from('notes').delete().eq('id', prev);
        createdThisSession.current.delete(prev);
        emitDataChanged('notes');
      }
    }, 2000);
  }, [selectedNoteId]);

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
      const params = new URLSearchParams(searchParams.toString());
      if (folderName) {
        params.set('folder', folderName);
      } else {
        params.delete('folder');
      }
      // pane 2 lists that folder's notes, card shows active, most recent note opens
      const targetNotes = folderName ? notes.filter((n) => n.folder === folderName) : notes;
      if (targetNotes.length > 0) {
        params.set('id', targetNotes[0].id);
      } else {
        params.delete('id');
      }
      params.set('filter', 'all');
      setActiveFilter('all');
      router.push(`/notes?${params.toString()}`);
    },
    [router, searchParams, notes]
  );

  const handleCreateNewNote = useCallback(async () => {
    if (!user || creating) return;
    setCreating(true);
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
      if (data) {
        createdThisSession.current.add(data.id);
        selectNote(data.id);
        emitDataChanged('notes');
        setTimeout(() => {
          const el = (document.getElementById('note-title-input') ||
            document.querySelector('textarea[placeholder="Untitled"]')) as HTMLTextAreaElement | null;
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 50);
      }
    } catch (error) {
      console.error('[notes] create failed', error);
      toast.show('Could not create a note. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  }, [user, creating, selectedFolder, selectNote, supabase, toast]);

  useEffect(() => {
    const handleCreateEvent = () => {
      handleCreateNewNote();
    };
    window.addEventListener('fx:create-note', handleCreateEvent);
    return () => window.removeEventListener('fx:create-note', handleCreateEvent);
  }, [handleCreateNewNote]);

  useEffect(() => {
    if (searchParams.get('new') === '1' || searchParams.get('create') === '1') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('new');
      params.delete('create');
      router.replace(`/notes${params.toString() ? `?${params.toString()}` : ''}`);
      handleCreateNewNote();
    }
  }, [searchParams, router, handleCreateNewNote]);

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

  const handleSaveVoiceNote = async (transcript: string, durationSec: number) => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/voice-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          transcript,
          durationSeconds: durationSec,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save voice note');
      }

      emitDataChanged('note');
      fetchNotes(1, 100);
    } catch (err) {
      console.error('Audio processing failed:', err);
      throw err;
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
          disabled={creating}
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
          {existingFolders.length > 0 && (
            <div className="mt-2 ml-3 border-l border-line-strong pl-2.5 space-y-1 overflow-y-auto max-h-[360px]">
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
          )}

          {/* Ghost + New Folder Button */}
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="mt-auto w-full h-8 px-2 flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-ink hover:bg-surface-2 rounded-[10px] transition-colors"
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
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
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
            <div ref={desktopSentinelRef} className="h-4 w-full" />
          </div>
        </div>
      </div>

      {/* PANE 3: Editor or Folder Grid Overview (1fr) */}
      <div className="frost rounded-[28px] flex flex-col overflow-hidden relative">
        {activeFilter === 'folders' || (!currentNote && notes.length > 0) ? (
          /* Kintsugi Folder Overview (pane 3 when filter=folders or no note is selected) */
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Header row: breadcrumb "Notes / Folders" 13 (ink-3 / ink), right: search Input w-64 "Search folders", secondary sm "Sort" menu, primary sm "New folder" */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-line mb-6">
              <div className="flex items-center gap-1.5 text-[13px] shrink-0">
                <button
                  type="button"
                  onClick={() => selectFilter('all')}
                  className="text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  Notes
                </button>
                <span className="text-ink-3">/</span>
                <span className="text-ink font-semibold">Folders</span>
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-xl justify-end">
                <label className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search folders"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] pl-10 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
                <Popover
                  align="end"
                  trigger={
                    <button
                      type="button"
                      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-3)]"
                    >
                      <ArrowUpDown className="size-4" aria-hidden /> Sort
                    </button>
                  }
                >
                  <div className="w-40 p-1 flex flex-col gap-0.5">
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'updated', label: 'Recently updated' },
                      { key: 'count', label: 'Most notes' },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setFolderSortOption(s.key as any)}
                        className={`h-8 px-2.5 rounded-[8px] text-[12px] text-left transition-colors cursor-pointer ${
                          folderSortOption === s.key
                            ? 'bg-primary-soft text-primary-text font-semibold'
                            : 'text-ink hover:bg-surface-2'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Popover>
                <Tooltip content="New folder">
                  <button
                    type="button"
                    onClick={() => setIsNewFolderModalOpen(true)}
                    aria-label="New folder"
                    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-snow shadow-sm hover:brightness-110 active:scale-[0.98] transition"
                  >
                    <Plus className="size-4" strokeWidth={2.25} aria-hidden />
                    <span className="hidden xl:inline">New folder</span>
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Grid of FolderCards: grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5 */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
              {/* All Notes card first */}
              <FolderCard
                name="All notes"
                count={notes.length}
                updated={
                  notes.length > 0
                    ? `Updated ${formatRelativeDate(notes[0].updated_at || notes[0].created_at)}`
                    : 'No notes yet'
                }
                preview={notes.length > 0 ? stripHtml(notes[0].content) || notes[0].title : undefined}
                active={selectedFolder === null}
                onClick={() => selectFolder(null)}
              />

              {/* Each user folder */}
              {displayedFolders.map((f) => {
                const folderNotes = notes.filter((n) => n.folder === f);
                const latestNote = folderNotes[0];
                const latestText = latestNote
                  ? stripHtml(latestNote.content) || latestNote.title
                  : undefined;
                const updatedStr = latestNote
                  ? `Updated ${formatRelativeDate(latestNote.updated_at || latestNote.created_at)}`
                  : 'Updated recently';

                return (
                  <FolderCard
                    key={f}
                    name={f}
                    count={folderNotes.length}
                    updated={updatedStr}
                    preview={latestText}
                    active={selectedFolder === f}
                    onClick={() => selectFolder(f)}
                  />
                );
              })}

              {/* Dashed New folder tile */}
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(true)}
                className="h-[188px] w-full rounded-[18px] border-2 border-dashed border-line-strong flex flex-col items-center justify-center gap-2 text-ink-3 hover:text-ink hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus size={20} />
                </div>
                <span className="text-[13px] font-medium">New folder</span>
              </button>
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
        ) : (
          /* Workspace Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <EmptyState
              title="Your thoughts, organised."
              description="Capture notes, checklists and voice summaries in one calm place."
              actionLabel="New note"
              onAction={handleCreateNewNote}
            />
          </div>
        )}
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        open={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveVoiceNote={handleSaveVoiceNote}
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
