'use client';

import { useState, type KeyboardEvent } from 'react';
import { CalendarCheck2, Timer, Mic, Grid2x2 } from 'lucide-react';
import { MEDIA_MANIFEST, type ProductMediaItem } from './mediaManifest';
import { PhoneMockup } from './PhoneMockup';

interface ExperienceTab {
  id: string;
  label: string;
  title: string;
  summary: string;
  bullets: string[];
  icon: typeof CalendarCheck2;
  screens: [ProductMediaItem, ProductMediaItem];
}

const EXPERIENCE_TABS: ExperienceTab[] = [
  {
    id: 'plan',
    label: 'Plan & Schedule',
    title: 'Plan & Schedule',
    summary: 'Daily planning, task management, and calendar view in one calm workspace.',
    bullets: [
      'Organise daily tasks, priorities, and routines without building complex databases.',
      'Switch smoothly between a focused daily list and a full calendar timeline.',
      'Keep upcoming commitments visible alongside the work that matters today.',
    ],
    icon: CalendarCheck2,
    screens: [MEDIA_MANIFEST.planTab, MEDIA_MANIFEST.calendar],
  },
  {
    id: 'focus',
    label: 'Focus & Deep Work',
    title: 'Focus & Deep Work',
    summary: 'Customisable focus sessions, radial timer, and distraction blocking.',
    bullets: [
      'Start structured focus sessions with presets tailored to your pace of work.',
      'Track deep work through a calm, glanceable radial timer built to stay out of the way.',
      'Protect attention during active sessions with built-in distraction controls.',
    ],
    icon: Timer,
    screens: [MEDIA_MANIFEST.focusTab, MEDIA_MANIFEST.pomodoro],
  },
  {
    id: 'notes',
    label: 'Notes & Voice',
    title: 'Notes & Voice',
    summary: 'Structured notes and high-accuracy voice recordings with live transcription.',
    bullets: [
      'Capture structured notes in clean folders without visual clutter.',
      'Record thoughts by voice with a live waveform and high-accuracy transcription.',
      'Keep reference material and meeting notes beside your daily plan.',
    ],
    icon: Mic,
    screens: [MEDIA_MANIFEST.notesTab, MEDIA_MANIFEST.voiceNote],
  },
  {
    id: 'habits',
    label: 'Habits & Home Screen',
    title: 'Habits & Home Screen',
    summary: 'Visual habit consistency tracking, event countdowns, and native iOS home screen widgets.',
    bullets: [
      'Build steady routines with visual heatmaps that highlight long-term consistency.',
      'Keep key milestones in view with clean event countdowns.',
      'Glance at tasks, habits, and calendar blocks directly from native iOS Home Screen widgets.',
    ],
    icon: Grid2x2,
    screens: [MEDIA_MANIFEST.habitHeatmap, MEDIA_MANIFEST.widgets],
  },
];

export function ConnectedExperienceShowcase() {
  const [activeTabId, setActiveTabId] = useState<string>(EXPERIENCE_TABS[0].id);

  const activeIndex = EXPERIENCE_TABS.findIndex((t) => t.id === activeTabId);
  const activeTab = EXPERIENCE_TABS[activeIndex >= 0 ? activeIndex : 0];

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % EXPERIENCE_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + EXPERIENCE_TABS.length) % EXPERIENCE_TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = EXPERIENCE_TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = EXPERIENCE_TABS[nextIndex];
    setActiveTabId(nextTab.id);
    const nextButton = document.getElementById(`exp-tab-${nextTab.id}`);
    nextButton?.focus();
  }

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div
        role="tablist"
        aria-label="Core Focalyst capabilities"
        className="grid grid-cols-2 gap-2 rounded-[20px] border border-line bg-surface-2/80 p-1.5 sm:inline-flex sm:flex-wrap sm:rounded-full"
      >
        {EXPERIENCE_TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              id={`exp-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`exp-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTabId(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-[14px] px-3.5 text-[13px] font-medium transition-all duration-150 cursor-pointer sm:h-9 sm:rounded-full sm:px-4 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                isActive
                  ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Frost Showcase Stage */}
      <div
        id={`exp-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`exp-tab-${activeTab.id}`}
        className="frost p-5 sm:p-8"
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Editorial Copy */}
          <div className="space-y-4 lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
              Core capability
            </p>
            <h3 className="font-display text-[30px] leading-[36px] tracking-[-0.015em] text-ink sm:text-[34px] sm:leading-[40px]">
              {activeTab.title}
            </h3>
            <p className="text-[15px] leading-[24px] text-ink-2">
              {activeTab.summary}
            </p>
            <ul className="space-y-2.5 pt-2">
              {activeTab.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-[14px] leading-[22px] text-ink-2">
                  <span
                    aria-hidden
                    className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2 Side-by-Side Floating PhoneMockups */}
          <div className="grid grid-cols-2 items-start gap-4 sm:gap-8 lg:col-span-7">
            <PhoneMockup
              media={activeTab.screens[0]}
              showCaption
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 240px, 260px"
            />
            <PhoneMockup
              media={activeTab.screens[1]}
              showCaption
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 240px, 260px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
