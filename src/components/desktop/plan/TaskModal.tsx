'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, Check, Calendar, Flag, Hash } from 'lucide-react';
import { usePlan, Priority } from '@/context/PlanContext';
import { localDateStr } from '@/lib/utils/date';
import { Skeleton } from '@/components/desktop/ui/Skeleton';
import { Popover } from '@/components/desktop/ui/Popover';
import { emitDataChanged } from '@/lib/events';

const DatePicker = dynamic(
  () => import('@/components/desktop/ui/DatePicker').then((m) => m.DatePicker),
  {
    ssr: false,
    loading: () => <Skeleton className="h-9 w-32 rounded-lg" />,
  }
);

interface TaskModalProps {
  defaultDate?: string;
  onClose: () => void;
}

export function TaskModal({ defaultDate, onClose }: TaskModalProps) {
  const { addTask, refreshData } = usePlan();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<string>(defaultDate || localDateStr(new Date()));
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = title.trim().length > 0;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValid || saving) return;

    setSaving(true);
    try {
      await addTask({
        title: title.trim(),
        is_completed: false,
        start_date: dueDate || '',
        end_date: dueDate || '',
        tags,
        priority,
        reminders: false,
      });
      await refreshData();
      emitDataChanged('task');
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#05070F]/50 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Card (width 560, glass-strong liquid) */}
      <div className="relative z-10 w-[560px] max-w-full rounded-[24px] glass-strong liquid shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        {/* Header: Title left, X + Check IconButtons right */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <h2 className="text-[18px] font-semibold text-ink">New task</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-[10px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              disabled={!isValid || saving}
              onClick={handleSave}
              className={`h-8 w-8 rounded-[10px] flex items-center justify-center transition-all ${
                isValid && !saving
                  ? 'bg-primary text-snow hover:bg-primary-hover shadow-sm'
                  : 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-50'
              }`}
            >
              <Check size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Task Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Title</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to accomplish?"
              className="w-full h-11 rounded-[14px] bg-surface-2 border border-line px-3 text-[14px] text-ink placeholder:text-ink-3 outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Due date (Glass DatePicker) */}
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Due date</label>
            <DatePicker
              value={dueDate}
              onChange={(v) => setDueDate(v)}
              className="w-full"
            />
          </div>

          {/* Priority (High / Medium / Low segmented) */}
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Priority</label>
            <div className="h-9 p-0.5 rounded-[12px] bg-surface-2 border border-line flex items-center">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 h-8 rounded-[10px] text-[12px] font-medium capitalize transition-all ${
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

          {/* Tags */}
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tg) => (
                <span
                  key={tg}
                  className="h-6 px-2.5 rounded-full bg-primary-soft text-primary-text text-[11px] font-medium flex items-center gap-1"
                >
                  #{tg}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tg))}
                    className="hover:opacity-75 text-[12px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className="flex-1 h-9 rounded-[10px] bg-surface-2 border border-line px-3 text-[12px] text-ink outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addTag}
                className="h-9 px-3 rounded-[10px] bg-surface-2 border border-line text-[12px] text-ink-2 hover:text-ink"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
