'use client';

import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Palette } from 'lucide-react';
import { Modal } from '@/components/desktop/ui/Modal';
import { Popover } from '@/components/desktop/ui/Popover';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan, HabitItem } from '@/context/PlanContext';

const DAYS = [
  { label: 'M', index: 0 },
  { label: 'T', index: 1 },
  { label: 'W', index: 2 },
  { label: 'T', index: 3 },
  { label: 'F', index: 4 },
  { label: 'S', index: 5 },
  { label: 'S', index: 6 },
];

const PRESET_ICONS = ['💧', '🚶‍♂️', '🧘', '📚', '💪', '🎯', '😴', '🏃', '☕', '✍️', '🥦', '🎸'];

const RECOMMENDED_COLORS = [
  '#FF6B00', // Focalyst Orange
  '#1951FC', // Royal Primary Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
];

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: HabitItem | null;
}

export function HabitModal({ isOpen, onClose, habitToEdit }: HabitModalProps) {
  const { user } = useAuth();
  const { addHabit, updateHabit, refreshData } = usePlan();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#1951FC');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [reminders, setReminders] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');
  const [durationMins, setDurationMins] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill or reset on open
  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name || '');
        setIcon(habitToEdit.icon || '🎯');
        setColor(habitToEdit.color || '#1951FC');
        setSelectedDays(habitToEdit.all_days ? [0, 1, 2, 3, 4, 5, 6] : habitToEdit.repeat_days || [0, 1, 2, 3, 4, 5, 6]);
        setReminders(habitToEdit.reminders || false);
        setReminderTime(habitToEdit.reminder_time ? habitToEdit.reminder_time.slice(0, 5) : '19:00');
        setStartDate(habitToEdit.start_date || '');
        setEndDate(habitToEdit.end_date || '');
      } else {
        setName('');
        setIcon('🎯');
        setColor('#1951FC');
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        setReminders(false);
        setReminderTime('19:00');
        setDurationMins(30);
        setStartDate('');
        setEndDate('');
      }
      setError('');
      setSaving(false);
    }
  }, [isOpen, habitToEdit]);

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const isFormValid = name.trim().length >= 2 && selectedDays.length > 0;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Habit name is required');
      return;
    }
    if (selectedDays.length === 0) {
      setError('Select at least one repeat day');
      return;
    }

    setSaving(true);
    setError('');

    const allDays = selectedDays.length === 7;
    const formattedReminderTime = reminders ? `${reminderTime}:00` : null;

    try {
      if (user) {
        const fullPayload: any = {
          user_id: user.id,
          name: trimmed,
          icon,
          color,
          frequency: allDays ? 'daily' : 'custom',
          custom_days: allDays ? null : selectedDays,
          reminder_time: formattedReminderTime,
          duration_minutes: reminders ? durationMins : null,
          start_date: startDate || null,
          end_date: endDate || null,
        };

        if (habitToEdit) {
          let { error: updateErr } = await supabase
            .from('habits')
            .update(fullPayload)
            .eq('id', habitToEdit.id);

          if (updateErr && (updateErr.code === 'PGRST204' || updateErr.message?.toLowerCase().includes('column'))) {
            // Core fallback
            const fallback = {
              name: trimmed,
              icon,
              color,
              frequency: allDays ? 'daily' : 'custom',
              custom_days: allDays ? null : selectedDays,
              reminder_time: formattedReminderTime,
            };
            const res = await supabase.from('habits').update(fallback).eq('id', habitToEdit.id);
            updateErr = res.error;
          }
          if (updateErr) throw updateErr;

          updateHabit(habitToEdit.id, {
            name: trimmed,
            icon,
            color,
            all_days: allDays,
            repeat_days: selectedDays,
            reminders,
            reminder_time: reminderTime,
            start_date: startDate,
            end_date: endDate,
          });
        } else {
          // Insert
          const insertPayload = {
            ...fullPayload,
            current_streak: 0,
            longest_streak: 0,
            is_active: true,
          };

          let { data: newRow, error: insertErr } = await supabase
            .from('habits')
            .insert([insertPayload])
            .select()
            .single();

          if (insertErr && (insertErr.code === 'PGRST204' || insertErr.message?.toLowerCase().includes('column'))) {
            const fallback = {
              user_id: user.id,
              name: trimmed,
              icon,
              color,
              frequency: allDays ? 'daily' : 'custom',
              custom_days: allDays ? null : selectedDays,
              reminder_time: formattedReminderTime,
              current_streak: 0,
              longest_streak: 0,
              is_active: true,
            };
            const res = await supabase.from('habits').insert([fallback]).select().single();
            insertErr = res.error;
            newRow = res.data;
          }
          if (insertErr) throw insertErr;
        }
      } else {
        // Local fallback
        if (habitToEdit) {
          updateHabit(habitToEdit.id, {
            name: trimmed,
            icon,
            color,
            all_days: allDays,
            repeat_days: selectedDays,
            reminders,
            reminder_time: reminderTime,
            start_date: startDate,
            end_date: endDate,
          });
        } else {
          await addHabit({
            name: trimmed,
            icon,
            color,
            all_days: allDays,
            repeat_days: selectedDays,
            reminders,
            reminder_time: reminderTime,
            start_date: startDate,
            end_date: endDate,
            current_streak: 0,
            completed_today: false,
            completedDates: [],
            created_at: new Date().toISOString(),
          });
        }
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Failed to save habit:', err);
      setError(err?.message || 'Failed to save habit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={habitToEdit ? 'Edit habit' : 'New habit'}
      confirmLabel={saving ? 'Saving...' : 'Save'}
      confirmDisabled={!isFormValid || saving}
      onConfirm={handleSave}
    >
      <div className="flex flex-col gap-5 pt-2">
        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g. Morning meditation"
            className="w-full h-11 rounded-[14px] bg-surface-2 border border-line px-3.5 text-[14px] text-ink placeholder:text-ink-3 outline-none focus:border-transparent focus:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] transition-all"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Icon picker grid */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">Icon</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_ICONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setIcon(preset)}
                className={`h-10 w-10 rounded-[12px] flex items-center justify-center text-[18px] transition-all ${
                  icon === preset
                    ? 'border-2 border-primary bg-primary-soft shadow-sm scale-105'
                    : 'bg-surface-2 border border-line hover:border-line-strong'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Color Swatches & Custom Picker */}
        <div>
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">Color</label>
          <div className="flex items-center gap-2.5">
            {RECOMMENDED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full transition-all shrink-0 ${
                  color.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-surface'
                    : 'hover:scale-105'
                }`}
              />
            ))}

            <Popover
              trigger={
                <button
                  type="button"
                  style={{ backgroundColor: color }}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-snow ring-1 ring-line-strong transition-transform hover:scale-105"
                  title="Custom color"
                >
                  <Palette size={13} className="text-snow drop-shadow-sm" />
                </button>
              }
              side="bottom"
              align="start"
            >
              <div className="p-3 flex flex-col gap-2">
                <HexColorPicker color={color} onChange={setColor} />
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-5 w-5 rounded-full border border-line" style={{ backgroundColor: color }} />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-24 text-[12px] font-mono uppercase bg-surface-2 border border-line rounded px-2 py-1 text-ink outline-none"
                  />
                </div>
              </div>
            </Popover>
          </div>
        </div>

        {/* Repeat Days (7 toggle pills M T W T F S S) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-medium text-ink-2">Repeat days</label>
            <button
              type="button"
              onClick={() => {
                if (selectedDays.length === 7) setSelectedDays([]);
                else setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
              }}
              className="text-[12px] text-primary-text font-medium hover:underline"
            >
              {selectedDays.length === 7 ? 'Deselect all' : 'Every day'}
            </button>
          </div>
          <div className="flex gap-2">
            {DAYS.map((d) => {
              const active = selectedDays.includes(d.index);
              return (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => toggleDay(d.index)}
                  className={`flex-1 h-9 rounded-[10px] text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-primary text-snow shadow-sm'
                      : 'bg-surface-2 border border-line text-ink-2 hover:text-ink'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder settings */}
        <div className="rounded-[16px] bg-surface-2/60 border border-line p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[13px] font-semibold text-ink block">Reminders</span>
              <span className="text-[12px] text-ink-3">Receive check-in notification</span>
            </div>
            <button
              type="button"
              onClick={() => setReminders(!reminders)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                reminders ? 'bg-primary' : 'bg-surface-3'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-snow shadow-sm transition-transform ${
                  reminders ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {reminders && (
            <div className="flex items-center gap-3 pt-2 border-t border-line">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-ink-3 uppercase mb-1">Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full h-9 rounded-[10px] bg-surface border border-line px-3 text-[13px] text-ink font-semibold outline-none"
                />
              </div>
              <div className="w-32">
                <label className="block text-[11px] font-medium text-ink-3 uppercase mb-1">Duration</label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full h-9 rounded-[10px] bg-surface border border-line px-2 text-[13px] text-ink font-semibold outline-none"
                >
                  <option value={15}>15m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>60m</option>
                  <option value={90}>90m</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Start / End Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 rounded-[10px] bg-surface-2 border border-line px-2.5 text-[12px] text-ink outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-9 rounded-[10px] bg-surface-2 border border-line px-2.5 text-[12px] text-ink outline-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default HabitModal;
