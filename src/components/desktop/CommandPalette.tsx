'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sun,
  CalendarCheck2,
  Timer,
  NotebookPen,
  ChartColumn,
  Users,
  Plug,
  Settings,
  Plus,
  Moon,
  Laptop,
  Sparkles,
  PanelLeft,
  LogOut,
  Calendar,
  CheckSquare,
  FileText,
  Bell,
  Play,
  BookOpen,
} from 'lucide-react';
import { Kbd } from '@/components/desktop/ui/Kbd';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import { GUIDES } from '@/content/guides';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSidebar?: () => void;
  onToggleAiDrawer?: () => void;
  onNewHabit?: () => void;
  onNewReminder?: () => void;
  onFocusTasksComposer?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onToggleSidebar,
  onToggleAiDrawer,
}: CommandPaletteProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { notes, fetchNotes } = useNotes(user?.id);
  const { setTheme } = useTheme();
  const { open: openCreate } = useCreate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setSearch(val);
  }, 200);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    debouncedSearch.run(val);
  };

  // Fetch initial notes for search when palette opens
  useEffect(() => {
    if (open && user?.id) {
      fetchNotes(1, 10);
    }
    if (!open) {
      setSearchInput('');
      setSearch('');
    }
  }, [open, user?.id, fetchNotes]);

  // Filter notes by search query
  const matchingNotes = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return notes
      .filter((n) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [search, notes]);

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#05070F]/40 backdrop-blur-[8px] pt-[18vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-[640px] rounded-[20px] glass-strong liquid overflow-hidden animate-in fade-in zoom-in-95 duration-150 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="w-full">
          {/* Top input row */}
          <div className="h-14 px-4 flex items-center gap-3 border-b border-line">
            <Search className="w-[18px] h-[18px] text-ink-3 shrink-0" />
            <Command.Input
              value={searchInput}
              onValueChange={handleSearchChange}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-ink-3 hover:text-ink"
            >
              <Kbd>Esc</Kbd>
            </button>
          </div>

          {/* Command List */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-[13px] text-ink-3">
              No results found.
            </Command.Empty>

            {/* Notes Group (only when search query is non-empty) */}
            {matchingNotes.length > 0 && (
              <Command.Group
                heading="Notes"
                className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
              >
                {matchingNotes.map((note) => (
                  <Command.Item
                    key={note.id}
                    value={`note-${note.id}-${note.title}`}
                    onSelect={() => runCommand(() => router.push(`/notes?id=${note.id}`))}
                    className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-ink-2 shrink-0" />
                      <span className="truncate">{note.title || 'Untitled note'}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Navigate Group */}
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="Today"
                onSelect={() => runCommand(() => router.push('/today'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-ink-2" />
                  <span>Today</span>
                </div>
                <Kbd>G T</Kbd>
              </Command.Item>
              <Command.Item
                value="Plan"
                onSelect={() => runCommand(() => router.push('/plan'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck2 className="w-4 h-4 text-ink-2" />
                  <span>Plan</span>
                </div>
                <Kbd>G P</Kbd>
              </Command.Item>
              <Command.Item
                value="Habits"
                onSelect={() => runCommand(() => router.push('/plan?view=habits'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-ink-2" />
                  <span>Habits</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Tasks"
                onSelect={() => runCommand(() => router.push('/plan?view=tasks'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-ink-2" />
                  <span>Tasks</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Calendar"
                onSelect={() => runCommand(() => router.push('/plan?view=calendar'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-ink-2" />
                  <span>Calendar</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Focus"
                onSelect={() => runCommand(() => router.push('/focus'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Timer className="w-4 h-4 text-ink-2" />
                  <span>Focus</span>
                </div>
                <Kbd>G F</Kbd>
              </Command.Item>
              <Command.Item
                value="Notes"
                onSelect={() => runCommand(() => router.push('/notes'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <NotebookPen className="w-4 h-4 text-ink-2" />
                  <span>Notes</span>
                </div>
                <Kbd>G N</Kbd>
              </Command.Item>
              <Command.Item
                value="Insights"
                onSelect={() => runCommand(() => router.push('/insights'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ChartColumn className="w-4 h-4 text-ink-2" />
                  <span>Insights</span>
                </div>
                <Kbd>G I</Kbd>
              </Command.Item>
              <Command.Item
                value="Accountability"
                onSelect={() => runCommand(() => router.push('/plan?view=habits#accountability'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-ink-2" />
                  <span>Accountability</span>
                </div>
              </Command.Item>
              <Command.Item
                value="MCP"
                onSelect={() => runCommand(() => router.push('/mcp'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plug className="w-4 h-4 text-ink-2" />
                  <span>MCP</span>
                </div>
              </Command.Item>
              <Command.Item
                value="AI connections"
                keywords={['mcp', 'claude', 'chatgpt', 'gemini', 'connector']}
                onSelect={() => runCommand(() => router.push('/settings?tab=connections'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plug className="w-4 h-4 text-ink-2" />
                  <span>AI connections</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Settings"
                onSelect={() => runCommand(() => router.push('/settings'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-ink-2" />
                  <span>Settings</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Create Group */}
            <Command.Group
              heading="Create"
              className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="New task"
                onSelect={() => runCommand(() => openCreate('task'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-ink-2" />
                  <span>New task</span>
                </div>
              </Command.Item>
              <Command.Item
                value="New habit"
                onSelect={() => runCommand(() => openCreate('habit'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-ink-2" />
                  <span>New habit</span>
                </div>
              </Command.Item>
              <Command.Item
                value="New note"
                onSelect={() => runCommand(() => openCreate('note'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-ink-2" />
                  <span>New note</span>
                </div>
              </Command.Item>
              <Command.Item
                value="New reminder"
                onSelect={() => runCommand(() => openCreate('reminder'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-ink-2" />
                  <span>New reminder</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Start focus session"
                onSelect={() => runCommand(() => openCreate('focus'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-ink-2" />
                  <span>Start focus session</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* How to use Group: one entry per guide */}
            <Command.Group
              heading="How to use"
              className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
            >
              {GUIDES.map((g) => (
                <Command.Item
                  key={g.slug}
                  value={`How to use: ${g.title}`}
                  keywords={['guide', 'help', 'how to', ...g.keywords]}
                  onSelect={() => runCommand(() => router.push(`/how-to/${g.slug}`))}
                  className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-ink-2" />
                    <span>{g.title}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions Group */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="Light theme"
                onSelect={() => runCommand(() => setTheme('light'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-ink-2" />
                  <span>Light theme</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Dark theme"
                onSelect={() => runCommand(() => setTheme('dark'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-ink-2" />
                  <span>Dark theme</span>
                </div>
              </Command.Item>
              <Command.Item
                value="System theme"
                onSelect={() => runCommand(() => setTheme('system'))}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-ink-2" />
                  <span>System theme</span>
                </div>
              </Command.Item>
              <Command.Item
                value="Ask Focalyst AI"
                onSelect={() => runCommand(() => onToggleAiDrawer?.())}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary-text" />
                  <span>Ask Focalyst AI</span>
                </div>
                <Kbd>⌘J</Kbd>
              </Command.Item>
              <Command.Item
                value="Collapse sidebar"
                onSelect={() => runCommand(() => onToggleSidebar?.())}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <PanelLeft className="w-4 h-4 text-ink-2" />
                  <span>Collapse sidebar</span>
                </div>
                <Kbd>⌘\</Kbd>
              </Command.Item>
              <Command.Item
                value="Log out"
                onSelect={() => runCommand(() => signOut())}
                className="h-10 rounded-[10px] px-3 flex items-center justify-between text-[14px] text-ink cursor-pointer aria-selected:bg-primary-soft aria-selected:text-ink transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-danger" />
                  <span>Log out</span>
                </div>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="h-9 border-t border-line px-4 flex items-center justify-between text-[12px] text-ink-3">
            <span>↑↓ to navigate · Enter to select · Esc to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
