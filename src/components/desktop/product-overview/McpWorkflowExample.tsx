'use client';

import { useState, type KeyboardEvent } from 'react';

interface McpScenario {
  id: string;
  label: string;
  prompt: string;
  toolCalls: string[];
  structuredResponse: string;
  synthesis: string;
}

const MCP_SCENARIOS: McpScenario[] = [
  {
    id: 'focus-patterns',
    label: 'Review my focus patterns this week',
    prompt: 'Review my focus patterns this week and tell me when I do my deepest work.',
    toolCalls: [
      'focalyst.get_weekly_focus_summary({ range: "7d" })',
      'focalyst.get_habit_consistency()',
    ],
    structuredResponse: `{
  "totalFocusMinutes": 640,
  "completedSessions": 16,
  "peakWindow": "08:30 to 11:15",
  "habitCompletionRate": 0.86
}`,
    synthesis:
      'You completed 16 focus sessions totaling 10 hours 40 minutes over the past 7 days, with 74% of deep work occurring between 08:30 and 11:15. Your habit consistency held at 86% across morning routines.',
  },
  {
    id: 'plan-tomorrow',
    label: 'Plan tomorrow from my overdue tasks',
    prompt: 'Look at my overdue tasks and build a realistic schedule for tomorrow morning.',
    toolCalls: [
      'focalyst.get_tasks({ status: "overdue" })',
      'focalyst.get_schedule({ day: "tomorrow" })',
    ],
    structuredResponse: `{
  "overdueTasks": 3,
  "openMorningBlocks": ["09:00-10:30", "11:00-12:00"],
  "topPriority": "Finalize Q4 product notes"
}`,
    synthesis:
      'Three tasks carried over from earlier this week. Blocking 09:00 to 10:30 for "Finalize Q4 product notes" and 11:00 to 12:00 for the two shorter reviews clears the backlog before midday.',
  },
];

export function McpWorkflowExample() {
  const [activeId, setActiveId] = useState<string>(MCP_SCENARIOS[0].id);
  const activeIndex = MCP_SCENARIOS.findIndex((s) => s.id === activeId);
  const active = MCP_SCENARIOS[activeIndex >= 0 ? activeIndex : 0];

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % MCP_SCENARIOS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + MCP_SCENARIOS.length) % MCP_SCENARIOS.length;
    } else {
      return;
    }
    e.preventDefault();
    const next = MCP_SCENARIOS[nextIndex];
    setActiveId(next.id);
    document.getElementById(`mcp-tab-${next.id}`)?.focus();
  }

  return (
    <div className="frost p-5 sm:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Example MCP workflow
          </p>
          <h3 className="text-[17px] font-semibold leading-[24px] text-ink">
            Grounded queries from external AI clients
          </h3>
        </div>

        <div
          role="tablist"
          aria-label="MCP workflow scenarios"
          className="flex flex-wrap gap-2 rounded-[14px] border border-line bg-surface-2/80 p-1"
        >
          {MCP_SCENARIOS.map((scenario, index) => {
            const isActive = scenario.id === active.id;
            return (
              <button
                key={scenario.id}
                id={`mcp-tab-${scenario.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`mcp-panel-${scenario.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(scenario.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`rounded-[10px] px-3 py-1.5 text-left text-[12px] font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                  isActive
                    ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`mcp-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`mcp-tab-${active.id}`}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* Step 1: External LLM prompt */}
        <div className="rounded-[14px] border border-line bg-surface-2/60 p-4 space-y-2">
          <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            01 · External LLM prompt
          </p>
          <p className="text-[14px] leading-[22px] text-ink">
            &ldquo;{active.prompt}&rdquo;
          </p>
        </div>

        {/* Step 2: Focalyst MCP tool call */}
        <div className="rounded-[14px] border border-line bg-surface-2/60 p-4 space-y-2.5">
          <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
            02 · Focalyst MCP tool call
          </p>
          <div className="space-y-1 font-mono text-[12px] leading-[18px] text-ink">
            {active.toolCalls.map((call) => (
              <p key={call} className="break-all rounded-[8px] bg-surface px-2.5 py-1.5 border border-line">
                {call}
              </p>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-[8px] border border-line bg-surface px-2.5 py-2 font-mono text-[11px] leading-[17px] text-ink-2">
            {active.structuredResponse}
          </pre>
        </div>

        {/* Step 3: Actionable synthesis */}
        <div className="rounded-[14px] border border-line bg-surface-2/60 p-4 space-y-2">
          <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            03 · Actionable synthesis
          </p>
          <p className="text-[14px] leading-[22px] text-ink-2">
            {active.synthesis}
          </p>
        </div>
      </div>
    </div>
  );
}
