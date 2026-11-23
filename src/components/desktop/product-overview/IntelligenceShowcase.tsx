'use client';

import { useState, type KeyboardEvent } from 'react';
import { Sparkles, FileBarChart2, Compass, LineChart } from 'lucide-react';
import { MEDIA_MANIFEST, type ProductMediaItem } from './mediaManifest';
import { PhoneMockup } from './PhoneMockup';

interface IntelligenceTab {
  id: string;
  label: string;
  headline: string;
  description: string;
  highlights: string[];
  icon: typeof Sparkles;
  media: ProductMediaItem;
}

const INTELLIGENCE_TABS: IntelligenceTab[] = [
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    headline: 'Conversational productivity guidance',
    description:
      'Ask questions about your week, break down overdue tasks, or plan tomorrow using context grounded in your actual Focalyst activity.',
    highlights: [
      'Understands your current tasks, habits, and focus history',
      'Helps turn scattered priorities into a realistic daily plan',
      'Keeps guidance calm, concise, and directly actionable',
    ],
    icon: Sparkles,
    media: MEDIA_MANIFEST.aiChat,
  },
  {
    id: 'weekly-report',
    label: 'Weekly Report',
    headline: 'A clear summary at the end of every week',
    description:
      'Review your weekly productivity score, task completion rate, deep work total, habit consistency, and standout strengths in one place.',
    highlights: [
      'Weekly productivity score with task completion breakdown',
      'Total deep work hours and habit consistency trends',
      'Highlights strengths automatically without manual spreadsheets',
    ],
    icon: FileBarChart2,
    media: MEDIA_MANIFEST.weeklyReport,
  },
  {
    id: 'catalyst-report',
    label: 'Catalyst Report',
    headline: 'Deeper pattern analysis and momentum',
    description:
      'Catalyst connects signals across focus blocks, routines, and completion timing to surface what is working and where to adjust.',
    highlights: [
      'Identifies peak focus windows and recurring bottlenecks',
      'Highlights momentum shifts across multi-week cycles',
      'Surfaces practical opportunities for steady improvement',
    ],
    icon: Compass,
    media: MEDIA_MANIFEST.catalystReport,
  },
  {
    id: 'live-insights',
    label: 'Live Insights',
    headline: 'Continuous trends across daily execution',
    description:
      'Track focus minutes, habit completion, and daily execution trends continuously so progress stays visible in real time.',
    highlights: [
      'Real-time visibility into focus duration and daily output',
      'Habit consistency tracking paired with task completion',
      'Clean, legible charts designed for quick reflection',
    ],
    icon: LineChart,
    media: MEDIA_MANIFEST.insightsTab,
  },
];

export function IntelligenceShowcase() {
  const [activeTabId, setActiveTabId] = useState<string>(INTELLIGENCE_TABS[0].id);
  const activeIndex = INTELLIGENCE_TABS.findIndex((t) => t.id === activeTabId);
  const activeTab = INTELLIGENCE_TABS[activeIndex >= 0 ? activeIndex : 0];

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % INTELLIGENCE_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + INTELLIGENCE_TABS.length) % INTELLIGENCE_TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = INTELLIGENCE_TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = INTELLIGENCE_TABS[nextIndex];
    setActiveTabId(nextTab.id);
    document.getElementById(`intel-tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Productivity intelligence views"
        className="grid grid-cols-2 gap-2 rounded-[20px] border border-line bg-surface-2/80 p-1.5 sm:inline-flex sm:flex-wrap sm:rounded-full"
      >
        {INTELLIGENCE_TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              id={`intel-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`intel-panel-${tab.id}`}
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

      <div
        id={`intel-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`intel-tab-${activeTab.id}`}
        className="frost p-5 sm:p-8"
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
              {activeTab.label}
            </p>
            <h3 className="font-display text-[30px] leading-[36px] tracking-[-0.015em] text-ink sm:text-[34px] sm:leading-[40px]">
              {activeTab.headline}
            </h3>
            <p className="max-w-[60ch] text-[15px] leading-[24px] text-ink-2">
              {activeTab.description}
            </p>
            <ul className="space-y-2.5 pt-2">
              {activeTab.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-[22px] text-ink-2">
                  <span
                    aria-hidden
                    className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:col-span-5">
            <div className="w-full max-w-[260px] sm:max-w-[270px]">
              <PhoneMockup
                key={activeTab.id}
                media={activeTab.media}
                showCaption
                sizes="(max-width: 640px) 240px, 270px"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
