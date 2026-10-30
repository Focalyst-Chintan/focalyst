'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Plus,
  Clock,
} from 'lucide-react';
import { usePlan, Reminder } from '@/context/PlanContext';
import { useDesktopShell } from '@/components/desktop/DesktopShellContext';
import { useCreate } from '@/components/desktop/create/CreateProvider';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { Button } from '@/components/desktop/ui/Button';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Checkbox } from '@/components/desktop/ui/Checkbox';
import { Popover } from '@/components/desktop/ui/Popover';
import { localDateStr, parseYMDToLocalNoon, addDaysYMD } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import { useData } from '@/lib/data/useData';
import { useSWRConfig } from 'swr';
import { useToast } from '@/components/desktop/ui/Toast';
import { normalizeReminderRows, logReminderQueryError } from '@/lib/utils/reminders';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TAG_COLORS: Record<string, string> = {
  Health: '#10B981',
  Work: '#2B6BFF',
  Urgent: '#EF4444',
  Study: '#8B5CF6',
  Personal: '#F97316',
};

// Parity with mobile doesReminderOccurOnDate. Reads both the phone format
// ("Every Week", "Custom") and the older web format ("weekly", "custom").
// A row that can't be read never shows instead of breaking the calendar.
function doesReminderOccurOnDate(rem: any, targetYMD: string): boolean {
  try {
    return occursOnDate(rem, targetYMD);
  } catch {
    return false;
  }
}

function occursOnDate(rem: any, targetYMD: string): boolean {
  const originYMD = String(rem.date || rem.day || '').slice(0, 10);
  if (!originYMD) return false;
  if (originYMD === targetYMD) return true;
  if (targetYMD < originYMD) return false;

  const [origY, origM, origD] = originYMD.split('-').map(Number);
  const [targY, targM, targD] = targetYMD.split('-').map(Number);
  const originDate = new Date(origY, origM - 1, origD, 12, 0, 0);
  const targetDate = new Date(targY, targM - 1, targD, 12, 0, 0);
  const diffDays = Math.round((targetDate.getTime() - originDate.getTime()) / 86400000);

  const rep = String(rem.repeat || rem.repeat_mode || 'Never').trim().toLowerCase();
  if (rep === 'never') return false;
  if (rep === 'every day' || rep === 'daily') return true;
  if (rep === 'every week' || rep === 'weekly') return diffDays % 7 === 0;
  if (rep === 'every 2 weeks') return diffDays % 14 === 0;
  if (rep === 'every month' || rep === 'monthly') return originDate.getDate() === targetDate.getDate();
  if (rep === 'every year' || rep === 'yearly') {
    return originDate.getDate() === targetDate.getDate() && originDate.getMonth() === targetDate.getMonth();
  }
  if (rep === 'custom') {
    const every = Math.max(1, Number(rem.custom_every || rem.custom_interval || 1));
    const unit = String(rem.custom_unit || rem.custom_frequency || 'Daily').toLowerCase();
    if (unit === 'daily' || unit === 'day') return diffDays % every === 0;
    if (unit === 'weekly' || unit === 'week') return diffDays % (every * 7) === 0;
    if (unit === 'monthly' || unit === 'month') {
      const monthsDiff =
        (targetDate.getFullYear() - originDate.getFullYear()) * 12 +
        (targetDate.getMonth() - originDate.getMonth());
      return monthsDiff >= 0 && monthsDiff % every === 0 && originDate.getDate() === targetDate.getDate();
    }
    if (unit === 'yearly' || unit === 'year') {
      const yearsDiff = targetDate.getFullYear() - originDate.getFullYear();
      return (
        yearsDiff >= 0 &&
        yearsDiff % every === 0 &&
        originDate.getMonth() === targetDate.getMonth() &&
        originDate.getDate() === targetDate.getDate()
      );
    }
  }
  return false;
}

export function CalendarDesktopView() {
  const { reminders: contextReminders } = usePlan();
  const { openNewReminderModal, openEditReminderModal, setContextPanel, setIsContextPanelOpen } =
    useDesktopShell();
  const create = useCreate();
  const { user } = useAuth();
  const supabase = createClient();

  const [allDbReminders, setAllDbReminders] = useState<any[]>([]);
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => localDateStr(today), [today]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDayYMD, setSelectedDayYMD] = useState(todayStr);

  // Quick jump popover open state
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);
  const [quickJumpYear, setQuickJumpYear] = useState(today.getFullYear());

  // Current time line tracking for week view
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const toast = useToast();
  const { mutate } = useSWRConfig();

  // Fetch the user's reminders. select('*') on purpose: the phone app, the web
  // and Focalyst AI write different optional columns, and naming a column that
  // doesn't exist (the date column is `day`, the tag column is `tag`) fails the
  // whole query.
  const remindersFetcher = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      logReminderQueryError(error);
      throw error;
    }
    return normalizeReminderRows(data);
  };

  const remindersKey = user ? `reminders:${user.id}` : null;
  const { data: cachedReminders, error: remindersError, mutate: mutateReminders } = useData(remindersKey, remindersFetcher);

  useEffect(() => {
    if (cachedReminders) {
      setAllDbReminders(cachedReminders);
    }
  }, [cachedReminders]);

  useEffect(() => {
    const unsub = onDataChanged(['reminder'], () => {
      mutateReminders();
    });
    const handleFocus = () => mutateReminders();
    window.addEventListener('focus', handleFocus);
    return () => {
      unsub();
      window.removeEventListener('focus', handleFocus);
    };
  }, [mutateReminders]);

  // Combined active reminders
  const remindersList = useMemo(() => {
    if (allDbReminders.length > 0) return allDbReminders;
    return contextReminders || [];
  }, [allDbReminders, contextReminders]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Clicking a day is a purposeful open of its agenda in the details panel
  const selectDay = (ymd: string) => {
    setSelectedDayYMD(ymd);
    setIsContextPanelOpen(true);
  };

  const jumpToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDayYMD(localDateStr(d));
  };

  // Month cells generation (7 columns Mon..Sun)
  const monthCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const jsFirstDay = firstDayOfMonth.getDay();
    const mondayOffset = jsFirstDay === 0 ? -6 : 1 - jsFirstDay;
    const startCalendarDate = new Date(currentYear, currentMonth, 1 + mondayOffset);

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const cursor = new Date(startCalendarDate);
    // 35 or 42 cells (5 or 6 weeks)
    for (let i = 0; i < 42; i++) {
      const dStr = localDateStr(cursor);
      const isCurrentMonth = cursor.getMonth() === currentMonth;
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedDayYMD;

      cells.push({
        dateStr: dStr,
        dayNumber: cursor.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
      });

      cursor.setDate(cursor.getDate() + 1);

      // Stop at 35 if we already covered all days of month
      if (i === 34 && cursor.getMonth() !== currentMonth && cursor > lastDayOfMonth) {
        break;
      }
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, selectedDayYMD]);

  // Week days for week view (the week containing selectedDayYMD)
  const weekDays = useMemo(() => {
    const selDate = parseYMDToLocalNoon(selectedDayYMD);
    const jsDay = selDate.getDay();
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(selDate);
    monday.setDate(selDate.getDate() + mondayOffset);

    const days: { dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[] = [];
    const cur = new Date(monday);
    for (let i = 0; i < 7; i++) {
      const dStr = localDateStr(cur);
      days.push({
        dateStr: dStr,
        dayName: DAY_HEADERS[i],
        dayNumber: cur.getDate(),
        isToday: dStr === todayStr,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [selectedDayYMD, todayStr]);

  // Active agenda reminders for selectedDayYMD
  const selectedDayReminders = useMemo(() => {
    return remindersList.filter((rem) => doesReminderOccurOnDate(rem, selectedDayYMD));
  }, [remindersList, selectedDayYMD]);

  // Toggle reminder completion or star
  const handleToggleCompleted = async (rem: any) => {
    const nextVal = !rem.is_completed;
    const applyToggle = (list: any[]) =>
      list.map((r) => (r.id === rem.id ? { ...r, is_completed: nextVal } : r));

    setAllDbReminders((prev) => applyToggle(prev));

    if (user) {
      const key = `reminders:${user.id}`;
      try {
        await mutate<any[]>(
          key,
          async (current = []) => {
            const { error } = await supabase.from('reminders').update({ is_completed: nextVal }).eq('id', rem.id);
            if (error) throw error;
            return applyToggle(current);
          },
          {
            optimisticData: (current = []) => applyToggle(current),
            rollbackOnError: true,
            revalidate: false,
          }
        );
        emitDataChanged('reminder');
      } catch (e) {
        console.warn('Error updating completion:', e);
        toast.show("Could not save. Check your connection and try again.", 'error');
      }
    }
  };

  const handleToggleStarred = async (rem: any) => {
    const nextVal = !rem.is_starred;
    setAllDbReminders((prev) =>
      prev.map((r) => (r.id === rem.id ? { ...r, is_starred: nextVal } : r))
    );
    try {
      await supabase.from('reminders').update({ is_starred: nextVal }).eq('id', rem.id);
      emitDataChanged('reminder');
    } catch (e) {
      console.warn('Error updating star:', e);
    }
  };

  // Setup Context Panel for Selected Day Agenda
  useEffect(() => {
    const selDate = parseYMDToLocalNoon(selectedDayYMD);
    const formattedTitle = selDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    setContextPanel(
      <div className="flex flex-col gap-5">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 block mb-1">
            Agenda
          </span>
          <h3 className="text-[18px] font-semibold text-ink leading-tight">{formattedTitle}</h3>
        </div>

        {/* Reminders List */}
        <div className="flex flex-col gap-2 flex-1">
          {selectedDayReminders.length === 0 ? (
            <p className="text-[13px] text-ink-3 py-6 text-center">Nothing scheduled.</p>
          ) : (
            selectedDayReminders.map((r) => {
              const tagColor = r.color || TAG_COLORS[r.tag || r.category] || '#1951FC';
              return (
                <div
                  key={r.id}
                  onClick={() => openEditReminderModal(r)}
                  className="rounded-[14px] bg-surface-2/60 border border-line p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={Boolean(r.is_completed)}
                        onChange={() => handleToggleCompleted(r)}
                      />
                    </div>
                    <div className="truncate">
                      <div
                        className={`text-[14px] font-medium text-ink truncate ${
                          r.is_completed ? 'line-through text-ink-3' : ''
                        }`}
                      >
                        {r.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[12px] text-ink-3 tabular-nums">
                        <span>{r.all_day ? 'All day' : r.start_time || 'No time'}</span>
                        {r.tag && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${TAG_COLORS[r.tag] || '#1951FC'}20`,
                              color: TAG_COLORS[r.tag] || '#1951FC',
                            }}
                          >
                            {r.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStarred(r);
                    }}
                    className={`h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0 transition-colors ${
                      r.is_starred ? 'text-warning fill-warning' : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    <Star size={14} className={r.is_starred ? 'fill-current' : ''} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Secondary + New reminder button */}
        <div className="pt-2 border-t border-line">
          <Button
            variant="secondary"
            size="md"
            onClick={() => create.open('reminder', { date: selectedDayYMD })}
            className="w-full gap-2 justify-center"
          >
            <Plus size={16} />
            <span>New reminder</span>
          </Button>
        </div>
      </div>
    );
  }, [
    selectedDayYMD,
    selectedDayReminders,
    setContextPanel,
    openNewReminderModal,
    openEditReminderModal,
  ]);

  if (remindersError && allDbReminders.length === 0 && (!contextReminders || contextReminders.length === 0)) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-[20px] frost">
          <p className="text-[14px] text-ink mb-3">Couldn't load calendar reminders.</p>
          <Button variant="secondary" size="sm" onClick={() => mutateReminders()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Month title as a button opening quick-jump Popover */}
          <Popover
            open={quickJumpOpen}
            onOpenChange={setQuickJumpOpen}
            trigger={
              <button
                type="button"
                className="font-display text-[32px] font-normal text-ink flex items-center gap-2 hover:opacity-85 transition-opacity"
              >
                <span>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <ChevronDown size={20} className="text-ink-3" />
              </button>
            }
            align="start"
          >
            <div className="w-[360px] p-4 flex gap-4">
              {/* Year list left (scrollable) */}
              <div className="w-24 max-h-[220px] overflow-y-auto pr-2 border-r border-line flex flex-col gap-1">
                {Array.from({ length: 15 }, (_, i) => today.getFullYear() - 5 + i).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setQuickJumpYear(yr);
                      setCurrentYear(yr);
                    }}
                    className={`h-8 rounded-[8px] text-[13px] font-medium tabular-nums transition-colors text-center ${
                      yr === currentYear
                        ? 'bg-primary-soft text-primary-text font-semibold'
                        : 'text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              {/* 3x4 Month grid right */}
              <div className="flex-1 grid grid-cols-3 gap-1.5">
                {SHORT_MONTHS.map((mName, mIdx) => {
                  const isSelectedMonth = mIdx === currentMonth && quickJumpYear === currentYear;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(mIdx);
                        setCurrentYear(quickJumpYear);
                        setQuickJumpOpen(false);
                      }}
                      className={`h-10 rounded-[10px] text-[13px] font-medium transition-all ${
                        isSelectedMonth
                          ? 'bg-primary text-snow shadow-sm'
                          : 'text-ink hover:bg-surface-2'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>
          </Popover>

          {/* IconButtons ChevronLeft/ChevronRight */}
          <div className="flex items-center gap-1 ml-1">
            <IconButton label="Previous" size="sm" variant="ghost" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </IconButton>
            <IconButton label="Next" size="sm" variant="ghost" onClick={nextMonth}>
              <ChevronRight size={16} />
            </IconButton>
          </div>

          {/* Secondary "Today" */}
          <Button variant="secondary" size="sm" onClick={jumpToToday} className="px-3">
            Today
          </Button>
        </div>

        {/* Right-aligned SegmentedControl [Month | Week] */}
        <SegmentedControl
          value={calendarMode}
          onChange={(v) => setCalendarMode(v as any)}
          options={[
            { label: 'Month', value: 'month' },
            { label: 'Week', value: 'week' },
          ]}
        />
      </div>

      {/* MONTH VIEW */}
      {calendarMode === 'month' && (
        <div className="w-full rounded-[20px] frost overflow-hidden border border-line">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-line bg-surface-2/40">
            {DAY_HEADERS.map((dh) => (
              <div
                key={dh}
                className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3"
              >
                {dh}
              </div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-line">
            {monthCells.map((cell) => {
              const dayReminders = remindersList.filter((r) => doesReminderOccurOnDate(r, cell.dateStr));
              const visibleReminders = dayReminders.slice(0, 3);
              const extraCount = dayReminders.length - 3;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => selectDay(cell.dateStr)}
                  className={`min-h-[112px] p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                    cell.isSelected ? 'bg-primary-soft/40' : 'hover:bg-surface-2/40'
                  }`}
                >
                  {/* Date number top-left */}
                  <div className="flex items-center justify-between">
                    {cell.isToday ? (
                      <div className="h-[26px] w-[26px] rounded-full bg-ink text-canvas flex items-center justify-center text-[13px] font-semibold tabular-nums">
                        {cell.dayNumber}
                      </div>
                    ) : (
                      <span
                        className={`text-[13px] font-medium tabular-nums ${
                          cell.isCurrentMonth ? 'text-ink' : 'text-ink-3/50'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    )}
                  </div>

                  {/* Event chips */}
                  <div className="flex flex-col gap-1 mt-1 flex-1">
                    {visibleReminders.map((rem) => {
                      const tagColor = rem.color || TAG_COLORS[rem.tag || rem.category] || '#1951FC';
                      return (
                        <div
                          key={rem.id}
                          className={`h-5 rounded-[6px] px-1.5 flex items-center gap-1 text-[11px] font-medium truncate ${
                            rem.is_completed ? 'line-through opacity-60' : ''
                          }`}
                          style={{
                            backgroundColor: `${tagColor}24`,
                            color: tagColor,
                          }}
                        >
                          {rem.is_starred && <Star size={10} className="fill-current shrink-0" />}
                          <span className="truncate">{rem.title}</span>
                        </div>
                      );
                    })}

                    {extraCount > 0 && (
                      <span className="text-[11px] font-medium text-ink-2 pl-1">
                        +{extraCount} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {calendarMode === 'week' && (
        <div className="w-full rounded-[20px] frost overflow-hidden border border-line flex flex-col">
          {/* Day Headers row with 56px left gutter */}
          <div className="flex border-b border-line bg-surface-2/40">
            <div className="w-14 shrink-0 border-r border-line" />
            <div className="grid grid-cols-7 flex-1 divide-x divide-line">
              {weekDays.map((wd) => {
                const isSelected = wd.dateStr === selectedDayYMD;
                return (
                  <button
                    key={wd.dateStr}
                    type="button"
                    onClick={() => selectDay(wd.dateStr)}
                    className={`py-2.5 text-center flex flex-col items-center gap-0.5 transition-colors ${
                      isSelected ? 'bg-primary-soft/40' : 'hover:bg-surface-2/40'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      {wd.dayName}
                    </span>
                    {wd.isToday ? (
                      <span className="h-6 w-6 rounded-full bg-ink text-canvas text-[12px] font-semibold flex items-center justify-center tabular-nums">
                        {wd.dayNumber}
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold text-ink tabular-nums">
                        {wd.dayNumber}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Time Grid 06:00 to 24:00 (18 hours, 48px row height) */}
          <div className="relative max-h-[640px] overflow-y-auto flex">
            {/* 56px Time Gutter */}
            <div className="w-14 shrink-0 border-r border-line flex flex-col select-none">
              {Array.from({ length: 18 }, (_, i) => 6 + i).map((hour) => (
                <div
                  key={hour}
                  className="h-12 pr-2 text-right text-[11px] tabular-nums text-ink-3 pt-1 border-b border-line/40"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 7 Columns Grid */}
            <div className="grid grid-cols-7 flex-1 divide-x divide-line relative">
              {/* Hour rows guidelines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="h-12 border-b border-line/40 w-full" />
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((wd) => {
                const dayReminders = remindersList.filter(
                  (r) => doesReminderOccurOnDate(r, wd.dateStr) && !r.all_day && r.start_time
                );

                // Check if current-time line falls in today's column
                const isTodayCol = wd.isToday;
                const currentTimeLineTop =
                  currentTimeMinutes >= 360 && currentTimeMinutes <= 1440
                    ? ((currentTimeMinutes - 360) / 60) * 48
                    : null;

                return (
                  <div
                    key={wd.dateStr}
                    onClick={() => selectDay(wd.dateStr)}
                    className="relative h-[864px] transition-colors"
                  >
                    {/* Events absolutely positioned by start_time/end_time */}
                    {dayReminders.map((rem) => {
                      const [sh, sm] = (rem.start_time || '09:00').split(':').map(Number);
                      const [eh, em] = (rem.end_time || '10:00').split(':').map(Number);
                      const startMins = Math.max(360, sh * 60 + sm);
                      const endMins = Math.max(startMins + 30, Math.min(1440, eh * 60 + em));

                      const topPx = ((startMins - 360) / 60) * 48;
                      const heightPx = Math.max(28, ((endMins - startMins) / 60) * 48);
                      const tagColor = rem.color || TAG_COLORS[rem.tag || rem.category] || '#1951FC';

                      return (
                        <div
                          key={rem.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            create.open('reminder', { initialData: rem });
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            backgroundColor: `${tagColor}24`,
                            borderLeft: `3px solid ${tagColor}`,
                          }}
                          className="absolute inset-x-1 rounded-[8px] p-1.5 text-[12px] overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10"
                        >
                          <div className="font-semibold text-ink truncate leading-tight">
                            {rem.title}
                          </div>
                          <div className="text-[11px] text-ink-2 tabular-nums">
                            {rem.start_time} - {rem.end_time}
                          </div>
                        </div>
                      );
                    })}

                    {/* Current-time red/primary indicator line in today's column */}
                    {isTodayCol && currentTimeLineTop !== null && (
                      <div
                        style={{ top: `${currentTimeLineTop}px` }}
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary -ml-0.5" />
                        <div className="h-0.5 bg-primary flex-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarDesktopView;
