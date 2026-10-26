'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Note } from '@/types';
import { useAutosave } from '@/lib/utils/useAutosave';
import { toEditorHTML, stripHtml } from './noteUtils';
import { createClient } from '@/lib/supabase';
import { emitDataChanged } from '@/lib/events';
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  Strikethrough,
  List,
  CheckSquare,
  Quote,
  Pin,
  Star,
  FolderInput,
  MoreHorizontal,
  PanelRight,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Trash2,
  ChevronsRight,
} from 'lucide-react';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import { Button } from '@/components/desktop/ui/Button';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';

const COMMANDS = [
  { id: 'h1', label: 'Heading 1', icon: Heading1, run: (ed: any) => ed.chain().focus().toggleHeading({ level: 1 }).run(), active: (ed: any) => ed.isActive('heading', { level: 1 }) },
  { id: 'h2', label: 'Heading 2', icon: Heading2, run: (ed: any) => ed.chain().focus().toggleHeading({ level: 2 }).run(), active: (ed: any) => ed.isActive('heading', { level: 2 }) },
  { id: 'bold', label: 'Bold', icon: Bold, run: (ed: any) => ed.chain().focus().toggleBold().run(), active: (ed: any) => ed.isActive('bold') },
  { id: 'italic', label: 'Italic', icon: Italic, run: (ed: any) => ed.chain().focus().toggleItalic().run(), active: (ed: any) => ed.isActive('italic') },
  { id: 'strike', label: 'Strikethrough', icon: Strikethrough, run: (ed: any) => ed.chain().focus().toggleStrike().run(), active: (ed: any) => ed.isActive('strike') },
  { id: 'bullet', label: 'Bullet list', icon: List, run: (ed: any) => ed.chain().focus().toggleBulletList().run(), active: (ed: any) => ed.isActive('bulletList') },
  { id: 'task', label: 'Checklist', icon: CheckSquare, run: (ed: any) => ed.chain().focus().toggleTaskList().run(), active: (ed: any) => ed.isActive('taskList') },
  { id: 'quote', label: 'Quote', icon: Quote, run: (ed: any) => ed.chain().focus().toggleBlockquote().run(), active: (ed: any) => ed.isActive('blockquote') },
];

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'just now';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface DesktopNoteEditorProps {
  note: Note;
  existingFolders: string[];
  totalNotesCount: number;
  folderNotesCount: number;
  onDeleteNote: (id: string) => Promise<void>;
  onFolderChange: (id: string, folder: string | null) => Promise<void>;
  onTogglePin: (note: Note) => Promise<void>;
  onToggleFavourite: (note: Note) => Promise<void>;
}

export default function DesktopNoteEditor({
  note,
  existingFolders,
  totalNotesCount,
  folderNotesCount,
  onDeleteNote,
  onFolderChange,
  onTogglePin,
  onToggleFavourite,
}: DesktopNoteEditorProps) {
  const supabase = createClient();
  const { setContextPanel, isContextPanelOpen, setIsContextPanelOpen } = useDesktopShell();

  const [title, setTitle] = useState(note.title || '');
  const [contentHtml, setContentHtml] = useState(() => toEditorHTML(note.content));
  const [showTranscript, setShowTranscript] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  // Floating Selection Bar state
  const [selectionMenuPos, setSelectionMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Slash Menu state
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    query: string;
    pos: { top: number; left: number };
    selectedIndex: number;
    range: { from: number; to: number };
  } | null>(null);

  const titleRef = useRef(title);
  titleRef.current = title;
  const contentRef = useRef(contentHtml);
  contentRef.current = contentHtml;
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize title textarea
  const adjustTextareaHeight = useCallback(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [title, adjustTextareaHeight]);

  // Unsaved draft restore state
  const [draftOffer, setDraftOffer] = useState<{ title: string; contentHtml: string } | null>(null);

  // Check for unsaved draft on note mount / switch
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`fx_note_draft_${note.id}`);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && (draft.title !== (note.title || '') || draft.contentHtml !== toEditorHTML(note.content))) {
          setDraftOffer({ title: draft.title, contentHtml: draft.contentHtml });
        } else {
          localStorage.removeItem(`fx_note_draft_${note.id}`);
        }
      }
    } catch (e) {
      // LocalStorage access might fail (e.g. privacy mode)
    }
  }, [note.id]);

  // Sync state when note prop changes
  useEffect(() => {
    setTitle(note.title || '');
    const html = toEditorHTML(note.content);
    setContentHtml(html);
    if (editor && !editor.isDestroyed) {
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }, [note.id]);

  // Save handler for autosave
  const handleSave = useCallback(async () => {
    const { error, status } = await supabase
      .from('notes')
      .update({
        title: titleRef.current,
        content: contentRef.current,
        updated_at: new Date().toISOString(),
      })
      .eq('id', note.id);

    if (error) {
      if (status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
      throw error;
    }

    try {
      localStorage.removeItem(`fx_note_draft_${note.id}`);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [note.id, supabase]);

  const { status: saveStatus, schedule: scheduleSave, flush: flushSave } = useAutosave(handleSave, 800);

  // Flush on note change or unmount, or when fx:flush-notes is triggered
  useEffect(() => {
    const handleFlushNotes = () => {
      void flushSave();
    };
    window.addEventListener('fx:flush-notes', handleFlushNotes);
    return () => {
      window.removeEventListener('fx:flush-notes', handleFlushNotes);
      void flushSave();
    };
  }, [note.id, flushSave]);

  const persistDraft = (newTitle: string, newContent: string) => {
    try {
      localStorage.setItem(
        `fx_note_draft_${note.id}`,
        JSON.stringify({ title: newTitle, contentHtml: newContent, timestamp: Date.now() })
      );
    } catch (e) {
      // Ignore quota or private mode issues
    }
  };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Write, or press / for commands',
      }),
    ],
    content: contentHtml,
    editorProps: {
      attributes: {
        class: 'fx-prose focus:outline-none min-h-[360px]',
      },
      handleKeyDown: (view, event) => {
        if (!slashMenu || !slashMenu.open) return false;

        const filtered = COMMANDS.filter((c) =>
          c.label.toLowerCase().includes(slashMenu.query.toLowerCase())
        );

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSlashMenu((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex: (prev.selectedIndex + 1) % (filtered.length || 1),
                }
              : null
          );
          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSlashMenu((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex:
                    (prev.selectedIndex - 1 + (filtered.length || 1)) % (filtered.length || 1),
                }
              : null
          );
          return true;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          if (filtered.length > 0) {
            const chosen = filtered[slashMenu.selectedIndex] || filtered[0];
            const { from, to } = slashMenu.range;
            editor?.chain().focus().deleteRange({ from, to }).run();
            chosen.run(editor);
            setSlashMenu(null);
          }
          return true;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          setSlashMenu(null);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setContentHtml(html);
      persistDraft(titleRef.current, html);
      scheduleSave();

      // Check slash command trigger
      const { selection } = ed.state;
      const { $from } = selection;
      const currentLineText = $from.parent.textContent;
      const textBeforeCursor = currentLineText.slice(0, $from.parentOffset);
      const match = textBeforeCursor.match(/\/([a-z0-9]*)$/i);

      if (match) {
        const coords = ed.view.coordsAtPos($from.pos);
        setSlashMenu({
          open: true,
          query: match[1] || '',
          pos: { top: coords.bottom + 8, left: coords.left },
          selectedIndex: 0,
          range: { from: $from.pos - match[0].length, to: $from.pos },
        });
      } else {
        setSlashMenu(null);
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { selection } = ed.state;
      if (selection && !selection.empty) {
        const coords = ed.view.coordsAtPos(selection.from);
        setSelectionMenuPos({
          top: Math.max(10, coords.top - 46),
          left: Math.max(10, coords.left),
        });
      } else {
        setSelectionMenuPos(null);
      }
    },
  });

  const rawText = stripHtml(contentHtml);
  const wordCount = rawText ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = rawText.length;

  let saveStatusText = 'Saved';
  if (saveStatus === 'saving') saveStatusText = 'Saving...';
  if (saveStatus === 'still-working') saveStatusText = 'Still working...';
  if (saveStatus === 'error') saveStatusText = "Couldn't save. Retrying";

  const relativeTime = formatRelativeTime(note.updated_at || note.created_at);

  // Kintsugi-Style Right Context Panel
  useEffect(() => {
    const freeTierMaxChars = 5000;
    const lengthPct = Math.min(100, Math.round((charCount / freeTierMaxChars) * 100));
    const folderRatio = totalNotesCount > 0 ? Math.min(100, Math.round((folderNotesCount / totalNotesCount) * 100)) : 0;

    const panelContent = (
      <div className="flex flex-col text-left">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
          <h3 className="text-[15px] font-semibold text-ink">Info</h3>
          <IconButton
            label="Close panel"
            tooltip="Close ⌘."
            size="sm"
            variant="ghost"
            onClick={() => setIsContextPanelOpen(false)}
          >
            <ChevronsRight size={16} />
          </IconButton>
        </div>

        {/* Summary Card 1: Note length */}
        <div className="bg-surface-2 rounded-[16px] p-4 mb-3 border border-line">
          <div className="text-[12px] text-ink-2">Note length</div>
          <div className="text-[22px] font-semibold tabular-nums text-ink mt-1">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${lengthPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-ink-3 tabular-nums text-right">
            {charCount.toLocaleString()} / {freeTierMaxChars.toLocaleString()} chars
          </div>
        </div>

        {/* Summary Card 2: Folder notes */}
        <div className="bg-surface-2 rounded-[16px] p-4 mb-3 border border-line">
          <div className="text-[12px] text-ink-2">Folder notes</div>
          <div className="text-[22px] font-semibold tabular-nums text-ink mt-1">
            {folderNotesCount} {folderNotesCount === 1 ? 'note' : 'notes'}
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${folderRatio}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-ink-3 tabular-nums text-right">
            {folderRatio}% of workspace notes
          </div>
        </div>

        {/* Properties Section */}
        <div className="mt-3">
          <h4 className="text-[13px] font-semibold text-ink mb-2.5">Properties</h4>
          <div className="space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Folder</span>
              <span className="font-medium text-ink truncate max-w-[170px]">
                {note.folder || 'All notes'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Created</span>
              <span className="font-medium text-ink tabular-nums">
                {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Last modified</span>
              <span className="font-medium text-ink tabular-nums">
                {relativeTime}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Characters</span>
              <span className="font-medium text-ink tabular-nums">
                {charCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="mt-6 pt-4 border-t border-line space-y-1">
          <button
            type="button"
            onClick={() => onTogglePin(note)}
            className="w-full flex items-center justify-between h-9 px-2.5 rounded-[10px] text-[13px] text-ink hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Pin size={14} className={note.is_pinned ? 'fill-primary text-primary' : 'text-ink-3'} />
              <span>Pin note</span>
            </div>
            <span className="text-[12px] text-ink-3 font-medium">
              {note.is_pinned ? 'Pinned' : 'Off'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onToggleFavourite(note)}
            className="w-full flex items-center justify-between h-9 px-2.5 rounded-[10px] text-[13px] text-ink hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star size={14} className={note.is_favourite ? 'fill-amber-400 text-amber-400' : 'text-ink-3'} />
              <span>Favourite</span>
            </div>
            <span className="text-[12px] text-ink-3 font-medium">
              {note.is_favourite ? 'Yes' : 'No'}
            </span>
          </button>
        </div>
      </div>
    );

    setContextPanel(panelContent);

    return () => {
      setContextPanel(null);
    };
  }, [
    note,
    wordCount,
    charCount,
    folderNotesCount,
    totalNotesCount,
    relativeTime,
    setContextPanel,
    setIsContextPanelOpen,
    onTogglePin,
    onToggleFavourite,
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Top Bar */}
      <div className="h-12 px-6 border-b border-line flex items-center justify-between shrink-0">
        <div className="text-[12px] text-ink-3 tabular-nums truncate max-w-[420px]">
          {note.folder || 'All notes'} · Edited {relativeTime} · {wordCount} words · {saveStatusText}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label={note.is_pinned ? 'Unpin note' : 'Pin note'}
            size="sm"
            variant="ghost"
            onClick={() => onTogglePin(note)}
          >
            <Pin size={16} className={note.is_pinned ? 'fill-primary text-primary' : 'text-ink-3'} />
          </IconButton>
          <IconButton
            label={note.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            size="sm"
            variant="ghost"
            onClick={() => onToggleFavourite(note)}
          >
            <Star
              size={16}
              className={note.is_favourite ? 'fill-amber-400 text-amber-400' : 'text-ink-3'}
            />
          </IconButton>

          {/* Move to folder popover */}
          <Popover
            align="end"
            trigger={
              <IconButton label="Move to folder" size="sm" variant="ghost">
                <FolderInput size={16} className="text-ink-2" />
              </IconButton>
            }
          >
            {({ close }) => (
              <div className="p-2 w-56 flex flex-col gap-1">
                <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  Move to folder
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await onFolderChange(note.id, null);
                    close();
                  }}
                  className={`h-8 px-2.5 rounded-[8px] flex items-center justify-between text-[13px] text-ink transition-colors hover:bg-surface-2 text-left ${
                    note.folder === null ? 'bg-primary-soft text-primary-text font-medium' : ''
                  }`}
                >
                  <span>None (All notes)</span>
                </button>
                {existingFolders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={async () => {
                      await onFolderChange(note.id, f);
                      close();
                    }}
                    className={`h-8 px-2.5 rounded-[8px] flex items-center justify-between text-[13px] text-ink transition-colors hover:bg-surface-2 text-left ${
                      note.folder === f ? 'bg-primary-soft text-primary-text font-medium' : ''
                    }`}
                  >
                    <span className="truncate">{f}</span>
                  </button>
                ))}
                <div className="h-px bg-line my-1" />
                <div className="px-1 py-1">
                  <input
                    type="text"
                    placeholder="New folder..."
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newFolderNameInput.trim()) {
                        await onFolderChange(note.id, newFolderNameInput.trim());
                        setNewFolderNameInput('');
                        close();
                      }
                    }}
                    className="w-full h-8 px-2.5 text-[12px] bg-surface-2 border border-line rounded-[8px] text-ink placeholder:text-ink-3 outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </Popover>

          {/* More actions menu */}
          <Popover
            align="end"
            trigger={
              <IconButton label="More note actions" size="sm" variant="ghost">
                <MoreHorizontal size={16} className="text-ink-2" />
              </IconButton>
            }
          >
            {({ close }) => (
              <div className="p-1.5 w-44 flex flex-col">
                <button
                  type="button"
                  onClick={async () => {
                    close();
                    await onDeleteNote(note.id);
                  }}
                  className="h-8 px-2.5 rounded-[8px] flex items-center gap-2 text-[13px] text-danger hover:bg-danger/10 transition-colors text-left font-medium"
                >
                  <Trash2 size={14} />
                  <span>Delete note</span>
                </button>
              </div>
            )}
          </Popover>

          {/* Context panel toggle */}
          <IconButton
            label="Toggle note info panel"
            tooltip="Info ⌘."
            size="sm"
            variant="ghost"
            onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
          >
            <PanelRight size={16} className={isContextPanelOpen ? 'text-primary' : 'text-ink-2'} />
          </IconButton>
        </div>
      </div>

      {/* Writing Column */}
      <div className="max-w-[720px] w-full mx-auto pt-10 px-8 pb-24 overflow-y-auto flex-1">
        {/* Voice Note Section */}
        {(note.note_type === 'voice' || note.audio_url || note.transcript) && (
          <div className="mb-6 space-y-4">
            {note.audio_url && (
              <div className="glass rounded-[20px] p-4">
                <audio controls src={note.audio_url} className="w-full h-10 rounded-lg outline-none" />
              </div>
            )}
            {note.content && (
              <div className="frost rounded-[16px] p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-text">
                  <Sparkles size={14} />
                  <span>AI SUMMARY</span>
                </div>
                <p className="text-[14px] leading-[22px] text-ink mt-1.5">
                  {stripHtml(note.content)}
                </p>
              </div>
            )}
            {note.transcript && (
              <div className="frost rounded-[16px] p-4">
                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-ink w-full text-left"
                >
                  {showTranscript ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <span>Transcript</span>
                </button>
                {showTranscript && (
                  <p className="text-[13px] leading-[20px] text-ink-2 mt-2 whitespace-pre-wrap">
                    {note.transcript}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Draft Restore Offer */}
        {draftOffer && (
          <div className="mb-4 px-4 py-3 rounded-[12px] bg-primary/10 border border-primary/20 flex items-center justify-between gap-4">
            <span className="text-[13px] text-ink">An unsaved draft was found from a previous session.</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTitle(draftOffer.title);
                  setContentHtml(draftOffer.contentHtml);
                  editor?.commands.setContent(draftOffer.contentHtml, { emitUpdate: false });
                  scheduleSave();
                  setDraftOffer(null);
                }}
                className="px-2.5 py-1 text-[12px] font-semibold text-primary-text bg-primary hover:bg-primary/90 rounded-[8px] transition-colors"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`fx_note_draft_${note.id}`);
                  } catch (e) {}
                  setDraftOffer(null);
                }}
                className="px-2 py-1 text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Note Title */}
        <textarea
          id="note-title-input"
          ref={titleTextareaRef}
          rows={1}
          value={title}
          onChange={(e) => {
            const newTitle = e.target.value;
            setTitle(newTitle);
            persistDraft(newTitle, contentRef.current);
            scheduleSave();
          }}
          onBlur={() => {
            void flushSave();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor?.chain().focus().run();
            }
          }}
          placeholder="Untitled"
          className="font-display text-[36px] leading-[44px] text-ink bg-transparent outline-none w-full resize-none placeholder:text-ink-3 mb-4"
        />

        {/* TipTap Editor */}
        <div className="relative" onBlur={() => void flushSave()}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Floating Selection Formatting Bar */}
      {selectionMenuPos && editor && (
        <div
          style={{ top: `${selectionMenuPos.top}px`, left: `${selectionMenuPos.left}px` }}
          className="fixed glass-strong rounded-[12px] p-1 flex items-center gap-0.5 z-50 shadow-lg animate-in fade-in duration-150"
        >
          {COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            const isActive = cmd.active(editor);
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => cmd.run(editor)}
                className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-primary-soft text-primary-text'
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                }`}
                title={cmd.label}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      )}

      {/* Slash Command Menu */}
      {slashMenu && slashMenu.open && (
        <div
          style={{ top: `${slashMenu.pos.top}px`, left: `${slashMenu.pos.left}px` }}
          className="fixed glass-strong rounded-[14px] p-1.5 w-56 z-50 shadow-xl border border-line animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Commands
          </div>
          <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
            {COMMANDS.filter((c) =>
              c.label.toLowerCase().includes(slashMenu.query.toLowerCase())
            ).map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === slashMenu.selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    editor?.chain().focus().deleteRange(slashMenu.range).run();
                    cmd.run(editor);
                    setSlashMenu(null);
                  }}
                  className={`h-8 px-2.5 rounded-[8px] flex items-center gap-2 text-[13px] transition-colors text-left ${
                    isSelected
                      ? 'bg-primary-soft text-primary-text font-medium'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{cmd.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
