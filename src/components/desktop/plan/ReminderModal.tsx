'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/desktop/ui/Modal';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan, Reminder } from '@/context/PlanContext';
import { localDateStr } from '@/lib/utils/date';
import { DatePicker } from '@/components/desktop/ui/DatePicker';
import { TimeSelect } from '@/components/desktop/ui/TimeSelect';

const CATEGORIES = [
  { label: 'Work', color: '#2B6BFF' },
  { label: 'Health', color: '#10B981' },
  { label: 'Urgent', color: '#EF4444' },
  { label: 'Study', color: '#8B5CF6' },
  { label: 'Personal', color: '#F97316' },
] as const;

const COLOR_SWATCHES = ['#2B6BFF', '#10B981', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];

const REPEAT_OPTIONS = [
  { label: 'Never', value: 'Never' },
  { label: 'Every Day', value: 'Daily' },
  { label: 'Every Week', value: 'Weekly' },
  { label: 'Every 2 Weeks', value: 'Every 2 Weeks' },
  { label: 'Every Month', value: 'Monthly' },
  { label: 'Every Year', value: 'Yearly' },
];

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminderToEdit?: any | null;
  prefillDate?: string | null;
}

export function ReminderModal({
  isOpen,
  onClose,
  reminderToEdit,
  prefillDate,
}: ReminderModalProps) {
  const { user } = useAuth();
  const { refreshData } = usePlan();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [repeat, setRepeat] = useState('Never');
  const [customEvery, setCustomEvery] = useState(1);
  const [customFrequency, setCustomFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Daily');
  const [tag, setTag] = useState<string>('Work');
  const [color, setColor] = useState('#2B6BFF');
  const [isStarred, setIsStarred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (reminderToEdit) {
        setTitle(reminderToEdit.title || '');
        setDescription(reminderToEdit.description || '');
        setDate(reminderToEdit.date || reminderToEdit.day || localDateStr());
        setAllDay(reminderToEdit.all_day || false);
        setStartTime(reminderToEdit.start_time || '09:00');
        setEndTime(reminderToEdit.end_time || '10:00');
        const rep = reminderToEdit.repeat || reminderToEdit.repeat_mode || 'Never';
        setRepeat(rep);
        setCustomEvery(reminderToEdit.custom_every || 1);
        setCustomFrequency(reminderToEdit.custom_unit || reminderToEdit.custom_frequency || 'Daily');
        const currentTag = reminderToEdit.tag || reminderToEdit.category || 'Work';
        setTag(currentTag);
        setColor(reminderToEdit.color || '#2B6BFF');
        setIsStarred(reminderToEdit.is_starred || false);
      } else {
        setTitle('');
        setDescription('');
        setDate(prefillDate || localDateStr());
        setAllDay(false);
        setStartTime('09:00');
        setEndTime('10:00');
        setRepeat('Never');
        setCustomEvery(1);
        setCustomFrequency('Daily');
        setTag('Work');
        setColor('#2B6BFF');
        setIsStarred(false);
      }
      setError('');
      setSaving(false);
    }
  }, [isOpen, reminderToEdit, prefillDate]);

  const handleTagChange = (t: string) => {
    setTag(t);
    const cat = CATEGORIES.find((c) => c.label === t);
    if (cat) setColor(cat.color);
  };

  const isFormValid = title.trim().length > 0 && Boolean(date);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!allDay && startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (!user) {
        throw new Error('Please sign in to save reminders.');
      }

      const payload: Record<string, any> = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        all_day: allDay,
        day: date,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        repeat,
        repeat_mode: repeat,
        color,
        tag,
        category: tag,
        is_starred: isStarred,
        is_completed: reminderToEdit?.is_completed || false,
      };

      if (reminderToEdit) {
        let { error: updateErr } = await supabase
          .from('reminders')
          .update(payload)
          .eq('id', reminderToEdit.id);

        if (updateErr && (updateErr.code === 'PGRST204' || updateErr.message?.toLowerCase().includes('column'))) {
          const fallback = {
            title: title.trim(),
            description: description.trim() || null,
            all_day: allDay,
            day: date,
            start_time: allDay ? null : startTime,
            end_time: allDay ? null : endTime,
            repeat,
            color,
            tag,
            is_starred: isStarred,
          };
          const res = await supabase.from('reminders').update(fallback).eq('id', reminderToEdit.id);
          updateErr = res.error;
        }
        if (updateErr) throw updateErr;
      } else {
        let { error: insertErr } = await supabase.from('reminders').insert([payload]);

        if (insertErr && (insertErr.code === 'PGRST204' || insertErr.message?.toLowerCase().includes('column'))) {
          const fallback = {
            user_id: user.id,
            title: title.trim(),
            all_day: allDay,
            day: date,
            start_time: allDay ? null : startTime,
            end_time: allDay ? null : endTime,
            repeat,
            color,
            tag,
          };
          const res = await supabase.from('reminders').insert([fallback]);
          insertErr = res.error;
        }
        if (insertErr) throw insertErr;
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Failed to save reminder:', err);
      setError(err?.message || 'Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={reminderToEdit ? 'Edit reminder' : 'New reminder'}
      confirmLabel={saving ? 'Saving...' : 'Save'}
      confirmDisabled={!isFormValid || saving}
      onConfirm={handleSave}
    >
      <div className="flex flex-col gap-4 pt-2">
        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </div>
        )}

        {/* Title & Star Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            placeholder="e.g. Weekly team sync"
            className="flex-1 h-11 rounded-[14px] bg-surface-2 border border-line px-3.5 text-[14px] text-ink placeholder:text-ink-3 outline-none focus:border-transparent focus:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] transition-all"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            title="Star reminder"
            className={`h-11 w-11 rounded-[14px] border border-line flex items-center justify-center transition-all ${
              isStarred
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-surface-2 text-ink-3 hover:text-ink'
            }`}
          >
            ★
          </button>
        </div>

        {/* Date & All Day Toggle */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Date</label>
            <DatePicker
              value={date}
              onChange={(v) => setDate(v)}
            />
          </div>
          <div className="flex items-center justify-between h-10 px-3 rounded-[12px] bg-surface-2/60 border border-line">
            <span className="text-[13px] font-medium text-ink">All day</span>
            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                allDay ? 'bg-primary' : 'bg-surface-3'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-snow shadow-sm transition-transform ${
                  allDay ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Start / End Time if not all day */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1">Start time</label>
              <TimeSelect
                value={startTime}
                onChange={(v) => setStartTime(v)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1">End time</label>
              <TimeSelect
                value={endTime}
                onChange={(v) => setEndTime(v)}
              />
            </div>
          </div>
        )}

        {/* Repeat Select */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1">Repeat</label>
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="w-full h-10 rounded-[12px] bg-surface-2 border border-line px-3 text-[13px] text-ink font-medium outline-none"
          >
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Repeat Fields */}
        {repeat === 'Custom' && (
          <div className="flex items-center gap-2 p-3 rounded-[12px] bg-surface-2/60 border border-line text-[13px] text-ink">
            <span>Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={customEvery}
              onChange={(e) => setCustomEvery(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 h-8 rounded-[8px] bg-surface border border-line px-2 text-center font-semibold outline-none"
            />
            <select
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value as any)}
              className="h-8 rounded-[8px] bg-surface border border-line px-2 font-medium outline-none"
            >
              <option value="Daily">day(s)</option>
              <option value="Weekly">week(s)</option>
              <option value="Monthly">month(s)</option>
              <option value="Yearly">year(s)</option>
            </select>
          </div>
        )}

        {/* Tag pills */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Tag</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleTagChange(cat.label)}
                className={`h-8 px-3 rounded-full text-[12px] font-medium transition-all ${
                  tag === cat.label
                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-surface'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${cat.color}20`,
                  color: cat.color,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour override swatches */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Color override</label>
          <div className="flex items-center gap-2.5">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                style={{ backgroundColor: swatch }}
                className={`h-6 w-6 rounded-full transition-transform ${
                  color === swatch
                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-surface scale-110'
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ReminderModal;
