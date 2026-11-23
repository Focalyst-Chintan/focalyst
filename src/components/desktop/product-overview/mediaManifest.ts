export interface ProductMediaItem {
  id: string;
  filename: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const DEMO_VIDEO = {
  enabled: false,
  src: '/product-overview/demo.mp4',
  title: 'Focalyst product walkthrough',
} as const;

export const WRAPPED_DEMO_VIDEO = {
  src: '/product-overview/wrapped-2026-demo.mp4',
  durationSeconds: 28.5,
  initialRestTime: 3.5,
  title: 'Focalyst 2026 Wrapped walkthrough',
} as const;

export const MCP_DEMO_VIDEO = {
  src: '/product-overview/mcp-claude-demo.mp4',
  durationSeconds: 82.3,
  initialRestTime: 16.0,
  title: 'Claude using Focalyst MCP walkthrough',
} as const;

export const MEDIA_MANIFEST = {
  planTab: {
    id: 'planTab',
    filename: 'plan-tab-new.png',
    src: '/product-overview/plan-tab-new.png',
    alt: 'Focalyst Plan tab showing daily tasks, habits, and scheduled priorities',
    caption: 'Daily planning with tasks and habits in one unified view',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  calendar: {
    id: 'calendar',
    filename: 'calendar-new.png',
    src: '/product-overview/calendar-new.png',
    alt: 'Focalyst calendar view displaying scheduled blocks and daily commitments',
    caption: 'Calendar view aligned with tasks and routines',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  focusTab: {
    id: 'focusTab',
    filename: 'focus-tab-new.png',
    src: '/product-overview/focus-tab-new.png',
    alt: 'Focalyst Focus tab with customisable session presets and distraction controls',
    caption: 'Customisable focus sessions built to protect attention',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  pomodoro: {
    id: 'pomodoro',
    filename: 'pomodoro-new.png',
    src: '/product-overview/pomodoro-new.png',
    alt: 'Focalyst active radial Pomodoro timer during a deep work session',
    caption: 'Radial focus timer for distraction-free deep work',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  notesTab: {
    id: 'notesTab',
    filename: 'notes-tab-new.png',
    src: '/product-overview/notes-tab-new.png',
    alt: 'Focalyst Notes workspace with structured folders and clean typography',
    caption: 'Structured notes organised alongside daily work',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  voiceNote: {
    id: 'voiceNote',
    filename: 'voice-note-new.png',
    src: '/product-overview/voice-note-new.png',
    alt: 'Focalyst voice recording screen with live audio waveform and transcription',
    caption: 'Voice capture with live waveform and transcription',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  habitHeatmap: {
    id: 'habitHeatmap',
    filename: 'habit-heatmap-new.png',
    src: '/product-overview/habit-heatmap-new.png',
    alt: 'Focalyst habit consistency heatmap showing streaks across weeks',
    caption: 'Visual habit consistency heatmap over time',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  widgets: {
    id: 'widgets',
    filename: 'widgets-new.png',
    src: '/product-overview/widgets-new.png',
    alt: 'Focalyst native iOS Home Screen widgets for calendar, tasks, countdowns, and habits',
    caption: 'Native iOS Home Screen widgets at a glance',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  insightsTab: {
    id: 'insightsTab',
    filename: 'insights-tab-new.png',
    src: '/product-overview/insights-tab-new.png',
    alt: 'Focalyst Insights tab displaying focus minutes, habit completion, and trends',
    caption: 'Activity insights and personal progress trends',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  weeklyReport: {
    id: 'weeklyReport',
    filename: 'weekly-report-new.png',
    src: '/product-overview/weekly-report-new.png',
    alt: 'Focalyst weekly productivity report summarising completed tasks and focus time',
    caption: 'Automated weekly productivity summary',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  catalystReport: {
    id: 'catalystReport',
    filename: 'catalyst-report-new.png',
    src: '/product-overview/catalyst-report-new.png',
    alt: 'Focalyst Catalyst report with personalised productivity analysis',
    caption: 'Catalyst intelligence report and pattern reflection',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  aiChat: {
    id: 'aiChat',
    filename: 'ai-chat-new.png',
    src: '/product-overview/ai-chat-new.png',
    alt: 'Focalyst AI assistant conversation for planning tasks and reviewing habits',
    caption: 'Context-aware AI productivity assistant',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  badges: {
    id: 'badges',
    filename: 'badges.png',
    src: '/product-overview/badges.png',
    alt: 'Focalyst achievement badges, XP levels, and milestone streaks',
    caption: 'XP levels, badges, and consistency milestones',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  habitLeaderboard: {
    id: 'habitLeaderboard',
    filename: 'habit-leaderboard.png',
    src: '/product-overview/habit-leaderboard.png',
    alt: 'Focalyst accountability group habit leaderboard with shared streaks',
    caption: 'Shared habit accountability and group leaderboard',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
} as const satisfies Record<string, ProductMediaItem>;

export type ProductMediaKey = keyof typeof MEDIA_MANIFEST;

export const ALL_PRODUCT_MEDIA: ProductMediaItem[] = Object.values(MEDIA_MANIFEST);

export interface AiLogoAsset {
  id: string;
  name: string;
  filename: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const AI_LOGO_MANIFEST = {
  focalyst: {
    id: 'focalyst',
    name: 'Focalyst',
    filename: 'focalyst.png',
    src: '/product-overview/ai-logos/focalyst.png',
    alt: 'Focalyst logo',
    width: 512,
    height: 512,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    filename: 'claude.png',
    src: '/product-overview/ai-logos/claude.png',
    alt: 'Claude logo',
    width: 512,
    height: 512,
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    filename: 'chatgpt.png',
    src: '/product-overview/ai-logos/chatgpt.png',
    alt: 'ChatGPT logo',
    width: 512,
    height: 512,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    filename: 'gemini.png',
    src: '/product-overview/ai-logos/gemini.png',
    alt: 'Gemini logo',
    width: 512,
    height: 512,
  },
  claudeCode: {
    id: 'claudeCode',
    name: 'Claude Code',
    filename: 'claude-code.png',
    src: '/product-overview/ai-logos/claude-code.png',
    alt: 'Claude Code logo',
    width: 512,
    height: 512,
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    filename: 'perplexity.png',
    src: '/product-overview/ai-logos/perplexity.png',
    alt: 'Perplexity logo',
    width: 512,
    height: 512,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    filename: 'deepseek.png',
    src: '/product-overview/ai-logos/deepseek.png',
    alt: 'DeepSeek logo',
    width: 512,
    height: 512,
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    filename: 'qwen.png',
    src: '/product-overview/ai-logos/qwen.png',
    alt: 'Qwen logo',
    width: 512,
    height: 512,
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    filename: 'grok-com-logo.png',
    src: '/product-overview/ai-logos/grok-com-logo.png',
    alt: 'Grok logo',
    width: 256,
    height: 256,
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    filename: 'kimi-com-logo.png',
    src: '/product-overview/ai-logos/kimi-com-logo.png',
    alt: 'Kimi logo',
    width: 256,
    height: 256,
  },
} as const satisfies Record<string, AiLogoAsset>;

export const ALL_AI_LOGOS: AiLogoAsset[] = Object.values(AI_LOGO_MANIFEST);
