'use client';
import React, { useState } from 'react';
import { Chip } from '@/components/desktop/ui/Chip';
import { CopyField } from '@/components/desktop/ui/CopyField';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { useToast } from '@/components/desktop/ui/Toast';
import { MCP_URL } from './format';

type GuideTab = 'claude' | 'chatgpt' | 'gemini' | 'other';

const STORAGE_KEY = 'fx-mcp-guide-tab';
const CLAUDE_CODE_CMD = `claude mcp add --transport http focalyst ${MCP_URL}`;

const GUIDES: Record<
  GuideTab,
  { chip: string; note?: string; tip?: string; steps: { title: string; body?: React.ReactNode }[] }
> = {
  claude: {
    chip: 'Every Claude plan',
    note: 'Claude Free allows one custom connector.',
    tip: "Tip: in Claude's connector settings, set read-only tools to Always allow so Claude doesn't ask before every read.",
    steps: [
      { title: 'Open Claude on the web or the desktop app, then go to Customize → Connectors.' },
      { title: 'Click + Add, then Add custom connector.' },
      { title: 'Name it Focalyst and paste your connector URL.' },
      { title: 'Leave the other settings as they are and click Add.' },
      { title: 'Sign in to Focalyst and click Allow.' },
      { title: 'Ask Claude about your day. Once connected, it also works in the Claude phone app.' },
    ],
  },
  chatgpt: {
    chip: 'Business, Enterprise and Edu',
    note: "ChatGPT Free, Go and Plus can't add custom apps yet, and ChatGPT Pro can only read. We're preparing Focalyst for the ChatGPT app directory so it works on every plan. In Business workspaces, an admin or owner adds it.",
    steps: [
      { title: 'Open ChatGPT on the web and go to Plugins.' },
      { title: 'Click +, then Add custom MCP server.' },
      { title: 'Name it Focalyst and paste your connector URL under Connection.' },
      { title: 'Choose OAuth for authentication.' },
      { title: 'Tick I understand and want to continue, then click Create as a plugin.' },
      { title: 'Install it, sign in to Focalyst and click Allow. In a new chat, type @ and pick Focalyst.' },
    ],
  },
  gemini: {
    chip: 'Personal Google accounts in the US',
    note: 'For now Google allows custom apps only on personal accounts in the US, for people aged 18 or over, in English, with Keep Activity turned on.',
    steps: [
      { title: 'Open gemini.google.com on a computer.' },
      { title: "Click Settings, then Connected Apps. If you don't see it, open Personal Intelligence first." },
      { title: 'Under Custom apps, click Add a custom app.' },
      { title: 'Paste your connector URL and click Next.' },
      { title: 'Sign in to Focalyst and click Allow.' },
      { title: 'In a chat, type @ and pick Focalyst. It also works in the Gemini phone app.' },
    ],
  },
  other: {
    chip: 'Any MCP app with sign-in',
    steps: [
      {
        title: 'Claude Code: run this command',
        body: <CopyField value={CLAUDE_CODE_CMD} label="Copy command" className="mt-2" />,
      },
      { title: 'Cursor, VS Code and other apps: add a remote MCP server with your connector URL.' },
      { title: 'Sign in to Focalyst when the app asks, then click Allow.' },
    ],
  },
};

const PROMPTS = [
  "What's on my plate today?",
  'How many hours did I focus this week?',
  'Which habits am I slipping on?',
  'Summarise my voice notes from this week',
  'Add a task to revise anatomy tomorrow at 7 pm',
  'Mark my reading habit done',
];

export function SetupGuide() {
  const toast = useToast();
  // Settings renders only on the client (after the desktop check), so reading storage here is safe
  const [tab, setTab] = useState<GuideTab>(() => {
    try {
      const saved = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as GuideTab | null) : null;
      return saved && saved in GUIDES ? saved : 'claude';
    } catch {
      return 'claude';
    }
  });

  const choose = (t: GuideTab) => {
    setTab(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // storage unavailable
    }
  };

  const copyPrompt = async (p: string) => {
    try {
      await navigator.clipboard.writeText(p);
      toast.show('Copied', 'success');
    } catch {
      toast.show('Something went wrong. Please try again.', 'error');
    }
  };

  const guide = GUIDES[tab];

  return (
    <div className="frost rounded-[24px] p-6">
      <h3 className="text-[15px] font-semibold text-ink">Set up your AI app</h3>
      <SegmentedControl<GuideTab>
        className="mt-4 max-w-full overflow-x-auto"
        value={tab}
        onChange={choose}
        options={[
          { value: 'claude', label: 'Claude' },
          { value: 'chatgpt', label: 'ChatGPT' },
          { value: 'gemini', label: 'Gemini' },
          { value: 'other', label: 'Other apps' },
        ]}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <Chip variant="primary">{guide.chip}</Chip>
          <ol className="mt-4 space-y-3.5">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-text">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-[14px] leading-snug text-ink-2">
                  <p>{s.title}</p>
                  {s.body}
                </div>
              </li>
            ))}
          </ol>
          {guide.tip && <p className="mt-4 text-[13px] leading-snug text-ink-2">{guide.tip}</p>}
          {guide.note && (
            <p className="mt-4 rounded-[14px] bg-surface-2/70 p-3 text-[13px] leading-snug text-ink-3">{guide.note}</p>
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Your connector URL</p>
          <CopyField value={MCP_URL} label="Copy connector URL" />
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Try asking</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => copyPrompt(p)}
              className="rounded-full border border-line bg-surface-2/60 px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
