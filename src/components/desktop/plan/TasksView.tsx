'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  Calendar,
  Flag,
  Hash,
  Trash2,
  Check,
} from 'lucide-react';
import { usePlan, TaskItem, Priority } from '@/context/PlanContext';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';
import { Checkbox } from '@/components/desktop/ui/Checkbox';
import { Popover } from '@/components/desktop/ui/Popover';
import { Button } from '@/components/desktop/ui/Button';
import { Kbd } from '@/components/desktop/ui/Kbd';
import { EmptyState } from '@/components/desktop/ui/EmptyState';
import { localDateStr, addDaysYMD } from '@/lib/utils/date';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-ink-3',
};

export function TasksView() {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks } = usePlan();
  const { setContextPanel, setIsContextPanelOpen, composerFocusTrigger } = useDesktopShell();

  const [composerText, setComposerText] = useState('');
  const [composerDate, setComposerDate] = useState<string>(localDateStr());
  const [composerPriority, setComposerPriority] = useState<Priority>('medium');
  const [composerTags, setComposerTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  // Collapsed groups stored in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fx-tasks-collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { completed: true };
  });

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('fx-tasks-collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Focus composer when triggered by keyboard shortcut or context action
  useEffect(() => {
    if (composerFocusTrigger > 0) {
      composerInputRef.current?.focus();
    }
  }, [composerFocusTrigger]);

  const todayStr = useMemo(() => localDateStr(new Date()), []);
  const tomorrowStr = useMemo(() => addDaysYMD(todayStr, 1), [todayStr]);

  // Partition tasks into Groups: Overdue, Today, Upcoming, No date, Completed
  const { overdue, today, upcoming, noDate, completed } = useMemo(() => {
    const ov: TaskItem[] = [];
    const td: TaskItem[] = [];
    const up: TaskItem[] = [];
    const nd: TaskItem[] = [];
    const comp: TaskItem[] = [];

    (tasks || []).forEach((t) => {
      if (t.is_completed) {
        comp.push(t);
        return;
      }
      const dueDate = t.end_date || t.start_date;
      if (!dueDate) {
        nd.push(t);
      } else if (dueDate < todayStr) {
        ov.push(t);
      } else if (dueDate === todayStr) {
        td.push(t);
      } else {
        up.push(t);
      }
    });

    return { overdue: ov, today: td, upcoming: up, noDate: nd, completed: comp };
  }, [tasks, todayStr]);

  const [completedLimit, setCompletedLimit] = useState(50);

  // Selected task
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Debounced autosave state for ContextPanel editor
  const [editorTitle, setEditorTitle] = useState('');
  const [editorStartDate, setEditorStartDate] = useState('');
  const [editorDueDate, setEditorDueDate] = useState('');
  const [editorPriority, setEditorPriority] = useState<Priority>('medium');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [editorReminders, setEditorReminders] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedTask) {
      setEditorTitle(selectedTask.title || '');
      setEditorStartDate(selectedTask.start_date || '');
      setEditorDueDate(selectedTask.end_date || '');
      setEditorPriority(selectedTask.priority || 'medium');
      setEditorTags(selectedTask.tags || []);
      setEditorReminders(selectedTask.reminders || false);
      setSavedStatus(null);
    }
  }, [selectedTask?.id]);

  const triggerAutosave = useCallback(
    (updates: Partial<TaskItem>) => {
      if (!selectedTask) return;
      setSavedStatus('Saving...');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        updateTask(selectedTask.id, updates);
        setSavedStatus('Saved');
        setTimeout(() => setSavedStatus(null), 2000);
      }, 600);
    },
    [selectedTask, updateTask]
  );

  // Context Panel Editor Setup
  useEffect(() => {
    if (!selectedTask) {
      setContextPanel(null);
      return;
    }

    setContextPanel(
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Task details
          </span>
          {savedStatus && (
            <span className="text-[12px] text-ink-3 transition-opacity">
              {savedStatus}
            </span>
          )}
        </div>

        {/* Title Inline Input */}
        <div>
          <textarea
            value={editorTitle}
            onChange={(e) => {
              setEditorTitle(e.target.value);
              triggerAutosave({ title: e.target.value });
            }}
            rows={2}
            className="w-full bg-transparent text-[16px] font-semibold text-ink placeholder:text-ink-3 outline-none resize-none border-b border-transparent focus:border-line pb-1"
            placeholder="Task title"
          />
        </div>

        {/* Priority Segmented */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Priority</label>
          <div className="flex rounded-[10px] bg-surface-2 p-1 gap-1">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => {
              const active = editorPriority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setEditorPriority(p);
                    triggerAutosave({ priority: p });
                  }}
                  className={`flex-1 h-7 rounded-[8px] text-[12px] font-medium capitalize transition-all ${
                    active
                      ? 'bg-surface text-ink shadow-[var(--shadow-1)] font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Start date</label>
            <input
              type="date"
              value={editorStartDate}
              onChange={(e) => {
                setEditorStartDate(e.target.value);
                triggerAutosave({ start_date: e.target.value });
              }}
              className="w-full h-9 rounded-[10px] bg-surface-2 border border-line px-2 text-[12px] text-ink outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Due date</label>
            <input
              type="date"
              value={editorDueDate}
              onChange={(e) => {
                setEditorDueDate(e.target.value);
                triggerAutosave({ end_date: e.target.value });
              }}
              className="w-full h-9 rounded-[10px] bg-surface-2 border border-line px-2 text-[12px] text-ink outline-none"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {editorTags.map((tg) => (
              <span
                key={tg}
                className="h-6 px-2.5 rounded-full bg-primary-soft text-primary-text text-[11px] font-medium flex items-center gap-1"
              >
                #{tg}
                <button
                  type="button"
                  onClick={() => {
                    const next = editorTags.filter((t) => t !== tg);
                    setEditorTags(next);
                    triggerAutosave({ tags: next });
                  }}
                  className="hover:opacity-75 text-[12px]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Reminders Toggle */}
        <div className="flex items-center justify-between p-3 rounded-[12px] bg-surface-2 border border-line">
          <div>
            <span className="text-[13px] font-medium text-ink block">Reminder</span>
            <span className="text-[11px] text-ink-3">Notify when due</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !editorReminders;
              setEditorReminders(next);
              triggerAutosave({ reminders: next });
            }}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
              editorReminders ? 'bg-primary' : 'bg-surface-3'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-snow shadow-sm transition-transform ${
                editorReminders ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Created Date */}
        <div className="text-[12px] text-ink-3 pt-2">
          Created {selectedTask.start_date || 'recently'}
        </div>

        {/* Delete */}
        <div className="pt-2 border-t border-line">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              deleteTask(selectedTask.id);
              setSelectedTaskId(null);
            }}
            className="w-full text-danger hover:bg-danger/10 justify-start gap-2"
          >
            <Trash2 size={14} />
            <span>Delete task</span>
          </Button>
        </div>
      </div>
    );
    setIsContextPanelOpen(true);
  }, [
    selectedTask,
    editorTitle,
    editorStartDate,
    editorDueDate,
    editorPriority,
    editorTags,
    editorReminders,
    savedStatus,
    triggerAutosave,
    deleteTask,
    setContextPanel,
    setIsContextPanelOpen,
  ]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = composerText.trim();
    if (!trimmed) return;

    addTask({
      title: trimmed,
      is_completed: false,
      start_date: composerDate || todayStr,
      end_date: composerDate || todayStr,
      priority: composerPriority,
      tags: composerTags,
      reminders: false,
    });

    setComposerText('');
    setComposerTags([]);
    composerInputRef.current?.focus();
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const isOverdue = dateStr < todayStr;
    let label = dateStr;
    if (dateStr === todayStr) label = 'Today';
    else if (dateStr === tomorrowStr) label = 'Tomorrow';
    else {
      const d = new Date(dateStr);
      label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
    return { label, isOverdue };
  };

  // Drag and drop within group
  const dragTaskRef = useRef<TaskItem | null>(null);
  const dragOverTaskRef = useRef<TaskItem | null>(null);

  const handleDragStart = (t: TaskItem) => {
    dragTaskRef.current = t;
  };
  const handleDragEnter = (t: TaskItem) => {
    dragOverTaskRef.current = t;
  };
  const handleDragEnd = () => {
    if (!dragTaskRef.current || !dragOverTaskRef.current) return;
    if (dragTaskRef.current.id === dragOverTaskRef.current.id) return;

    const fromIdx = tasks.findIndex((x) => x.id === dragTaskRef.current?.id);
    const toIdx = tasks.findIndex((x) => x.id === dragOverTaskRef.current?.id);
    if (fromIdx !== -1 && toIdx !== -1) {
      const reordered = [...tasks];
      const [removed] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, removed);
      reorderTasks(reordered);
    }
    dragTaskRef.current = null;
    dragOverTaskRef.current = null;
  };

  const renderGroup = (
    title: string,
    groupKey: string,
    items: TaskItem[],
    isDangerCount: boolean = false
  ) => {
    if (items.length === 0) return null;
    const collapsed = Boolean(collapsedGroups[groupKey]);

    return (
      <div key={groupKey} className="flex flex-col mb-4">
        {/* Group Header */}
        <button
          type="button"
          onClick={() => toggleGroupCollapse(groupKey)}
          className="flex items-center gap-2 py-1.5 text-left group select-none"
        >
          <ChevronDown
            size={14}
            className={`text-ink-3 transition-transform duration-150 ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {title}
          </span>
          <span
            className={`rounded-full px-2 py-0.2 text-[11px] font-semibold tabular-nums ${
              isDangerCount
                ? 'bg-danger/15 text-danger'
                : 'bg-surface-2 text-ink-3'
            }`}
          >
            {items.length}
          </span>
        </button>

        {/* Task Rows */}
        {!collapsed && (
          <div className="flex flex-col gap-1 mt-1">
            {(() => {
              const visibleItems = groupKey === 'completed' ? items.slice(0, completedLimit) : items;
              return (
                <>
                  {visibleItems.map((t) => {
                    const isSelected = selectedTaskId === t.id;
                    const dueInfo = formatDueDate(t.end_date || t.start_date);

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => handleDragStart(t)}
                        onDragEnter={() => handleDragEnter(t)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`h-11 rounded-[12px] px-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-surface-2 border border-line-strong' : 'hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0 flex-1">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={t.is_completed}
                              onChange={() => updateTask(t.id, { is_completed: !t.is_completed })}
                            />
                          </div>
                          <span
                            className={`text-[14px] truncate ${
                              t.is_completed ? 'line-through text-ink-3' : 'text-ink font-normal'
                            }`}
                          >
                            {t.title}
                          </span>

                          {/* Tag chips */}
                          {t.tags && t.tags.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1 shrink-0">
                              {t.tags.slice(0, 2).map((tg) => (
                                <span
                                  key={tg}
                                  className="px-2 py-0.5 rounded-full bg-primary-soft text-primary-text text-[11px] font-medium"
                                >
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Priority dot & Due Date */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            title={`Priority: ${t.priority}`}
                            className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[t.priority] || 'bg-ink-3'}`}
                          />
                          {dueInfo && (
                            <span
                              className={`text-[12px] tabular-nums font-medium ${
                                dueInfo.isOverdue && !t.is_completed ? 'text-danger' : 'text-ink-3'
                              }`}
                            >
                              {dueInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {groupKey === 'completed' && items.length > completedLimit && (
                    <button
                      type="button"
                      onClick={() => setCompletedLimit((prev) => prev + 50)}
                      className="mt-2 py-2 text-center text-[13px] font-medium text-ink-2 hover:text-ink hover:bg-surface-2 rounded-lg transition-colors"
                    >
                      Show more ({items.length - completedLimit} remaining)
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const isListCompletelyEmpty = tasks.length === 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[840px]">
      {/* Top Composer */}
      <form onSubmit={handleCreateTask} className="flex flex-col gap-2">
        <div className="h-12 rounded-[14px] bg-surface-2 border border-line px-4 flex items-center justify-between shadow-inner focus-within:border-line-strong transition-all">
          <input
            ref={composerInputRef}
            type="text"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder="Add a task, press Enter"
            className="bg-transparent text-[14px] text-ink placeholder:text-ink-3 outline-none flex-1 pr-3"
          />
          <Kbd>↵</Kbd>
        </div>

        {/* Chip row while typing */}
        {composerText.length > 0 && (
          <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
            {/* Date chip */}
            <Popover
              trigger={
                <button
                  type="button"
                  className="h-8 px-3 rounded-full bg-surface-2 border border-line text-[12px] text-ink-2 hover:text-ink flex items-center gap-1.5"
                >
                  <Calendar size={13} className="text-ink-3" />
                  <span>{composerDate === todayStr ? 'Today' : composerDate || 'Date'}</span>
                </button>
              }
            >
              <div className="p-2">
                <input
                  type="date"
                  value={composerDate}
                  onChange={(e) => setComposerDate(e.target.value)}
                  className="text-[12px] bg-surface-2 border border-line rounded px-2 py-1 text-ink outline-none"
                />
              </div>
            </Popover>

            {/* Priority chip */}
            <Popover
              trigger={
                <button
                  type="button"
                  className="h-8 px-3 rounded-full bg-surface-2 border border-line text-[12px] text-ink-2 hover:text-ink flex items-center gap-1.5 capitalize"
                >
                  <Flag size={13} className="text-ink-3" />
                  <span>{composerPriority}</span>
                </button>
              }
            >
              <div className="w-28 p-1 flex flex-col gap-0.5">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setComposerPriority(p)}
                    className="h-7 px-2 rounded-[6px] text-[12px] capitalize text-left text-ink hover:bg-surface-2"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Popover>

            {/* Tags chip */}
            <Popover
              trigger={
                <button
                  type="button"
                  className="h-8 px-3 rounded-full bg-surface-2 border border-line text-[12px] text-ink-2 hover:text-ink flex items-center gap-1.5"
                >
                  <Hash size={13} className="text-ink-3" />
                  <span>{composerTags.length > 0 ? composerTags.join(', ') : 'Tags'}</span>
                </button>
              }
            >
              <div className="p-2 w-48 flex flex-col gap-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="New tag..."
                    className="flex-1 h-7 text-[12px] bg-surface-2 border border-line rounded px-2 text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTagInput.trim()) {
                        setComposerTags([...composerTags, newTagInput.trim()]);
                        setNewTagInput('');
                      }
                    }}
                    className="h-7 px-2 rounded bg-primary text-snow text-[11px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </Popover>
          </div>
        )}
      </form>

      {/* Task Groups */}
      {isListCompletelyEmpty ? (
        <div className="py-12" onClick={() => composerInputRef.current?.focus()}>
          <EmptyState
            title="Nothing on your list."
            description="Add one task you can finish today."
            actionLabel="Add task"
            onAction={() => composerInputRef.current?.focus()}
          />
        </div>
      ) : (
        <div className="flex flex-col">
          {renderGroup('Overdue', 'overdue', overdue, true)}
          {renderGroup('Today', 'today', today)}
          {renderGroup('Upcoming', 'upcoming', upcoming)}
          {renderGroup('No date', 'noDate', noDate)}
          {renderGroup('Completed', 'completed', completed)}
        </div>
      )}
    </div>
  );
}

export default TasksView;
