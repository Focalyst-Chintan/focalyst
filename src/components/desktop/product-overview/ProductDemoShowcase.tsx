'use client';

import { useState, type KeyboardEvent } from 'react';
import { DEMO_VIDEO, MEDIA_MANIFEST, type ProductMediaItem } from './mediaManifest';
import { PhoneMockup } from './PhoneMockup';

interface WalkthroughStep {
  id: string;
  numeral: string;
  label: string;
  title: string;
  description: string;
  media: ProductMediaItem;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'plan',
    numeral: '01',
    label: 'Plan',
    title: '01 Plan',
    description: 'Start the morning with clear daily priorities and scheduled habits.',
    media: MEDIA_MANIFEST.planTab,
  },
  {
    id: 'focus',
    numeral: '02',
    label: 'Focus',
    title: '02 Focus',
    description: 'Enter a distraction-free focus session built to protect attention.',
    media: MEDIA_MANIFEST.pomodoro,
  },
  {
    id: 'capture',
    numeral: '03',
    label: 'Capture',
    title: '03 Capture',
    description: 'Record thoughts naturally with live waveform capture and instant transcription.',
    media: MEDIA_MANIFEST.voiceNote,
  },
  {
    id: 'reflect',
    numeral: '04',
    label: 'Reflect',
    title: '04 Reflect',
    description: 'Close the week with an honest score, completion trends, and clear strengths.',
    media: MEDIA_MANIFEST.weeklyReport,
  },
];

export function ProductDemoShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = WALKTHROUGH_STEPS[activeIndex] ?? WALKTHROUGH_STEPS[0];

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % WALKTHROUGH_STEPS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + WALKTHROUGH_STEPS.length) % WALKTHROUGH_STEPS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = WALKTHROUGH_STEPS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveIndex(nextIndex);
    document.getElementById(`walkthrough-tab-${WALKTHROUGH_STEPS[nextIndex].id}`)?.focus();
  }

  return (
    <section aria-labelledby="walkthrough-heading" className="scroll-mt-24">
      <div className="glass liquid rounded-[28px] p-5 sm:p-8 lg:p-10">
        {DEMO_VIDEO.enabled ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                Day in the life
              </p>
              <h2
                id="walkthrough-heading"
                className="font-display text-[32px] leading-[38px] tracking-[-0.015em] text-ink sm:text-[38px] sm:leading-[44px]"
              >
                Product walkthrough
              </h2>
            </div>
            <video
              src={DEMO_VIDEO.src}
              title={DEMO_VIDEO.title}
              controls
              playsInline
              className="w-full rounded-[20px] border border-line bg-surface"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Step Controls & Editorial Copy */}
            <div className="space-y-6 lg:col-span-6">
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
                  Day-in-the-life walkthrough
                </p>
                <h2
                  id="walkthrough-heading"
                  className="font-display text-[32px] leading-[38px] tracking-[-0.015em] text-ink sm:text-[38px] sm:leading-[44px]"
                >
                  From morning plan to weekly reflection
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Daily walkthrough steps"
                className="space-y-2.5"
              >
                {WALKTHROUGH_STEPS.map((step, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={step.id}
                      id={`walkthrough-tab-${step.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`walkthrough-panel-${step.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveIndex(index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`w-full rounded-[16px] border px-4 py-3.5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                        isActive
                          ? 'border-line-strong bg-surface shadow-[var(--shadow-1)]'
                          : 'border-transparent bg-surface-2/50 hover:bg-surface-2/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`tabular-nums text-[12px] font-semibold ${
                              isActive ? 'text-primary-text' : 'text-ink-3'
                            }`}
                          >
                            {step.numeral}
                          </span>
                          <span
                            className={`text-[15px] font-semibold ${
                              isActive ? 'text-ink' : 'text-ink-2'
                            }`}
                          >
                            {step.label}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className={`h-1.5 w-1.5 rounded-full transition-opacity ${
                            isActive ? 'bg-primary opacity-100' : 'opacity-0'
                          }`}
                        />
                      </div>
                      <p
                        className={`mt-1.5 pl-6 text-[13px] leading-[20px] ${
                          isActive ? 'text-ink-2' : 'text-ink-3'
                        }`}
                      >
                        {step.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Mockup Stage */}
            <div
              id={`walkthrough-panel-${activeStep.id}`}
              role="tabpanel"
              aria-labelledby={`walkthrough-tab-${activeStep.id}`}
              className="flex flex-col items-center justify-center lg:col-span-6"
            >
              <div className="w-full max-w-[260px] sm:max-w-[280px]">
                <PhoneMockup
                  key={activeStep.id}
                  media={activeStep.media}
                  showCaption
                  caption={`${activeStep.title}: ${activeStep.description}`}
                  sizes="(max-width: 640px) 240px, 280px"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
