// "How to use" guides: the single source for the public /guides pages and the
// in-app /how-to pages. Steps support **bold** for UI names and [[Key]] for
// keyboard keys; nothing else is parsed.

export type Platform = {
  methods?: { label?: string; steps: string[] }[]; // steps support **bold** and [[Key]] for Kbd
  notes?: string[];
  unavailable?: string; // shown instead of steps when the feature isn't on this platform
};

export type GuideCategory = 'plan' | 'focus' | 'notes' | 'insights-ai' | 'personalise';

export type Guide = {
  slug: string;
  title: string; // action, sentence case: "Add a task"
  question: string; // H1: "How do I add a task in Focalyst?"
  category: GuideCategory;
  icon: string; // lucide name
  color: string; // hex, reused from the feature pills
  summary: string; // card line, max ~90 characters
  answer: string; // quick answer, 40 to 60 words
  web: Platform;
  phone: Platform;
  goodToKnow?: string[];
  pro?: 'none' | 'partly' | 'only';
  related: string[]; // slugs
  keywords: string[]; // for search and the meta keywords
  updated: string; // YYYY-MM-DD
};

export const GUIDE_CATEGORIES: { key: GuideCategory; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'focus', label: 'Focus' },
  { key: 'notes', label: 'Notes' },
  { key: 'insights-ai', label: 'Insights and AI' },
  { key: 'personalise', label: 'Personalise' },
];

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  plan: 'Plan',
  focus: 'Focus',
  notes: 'Notes',
  'insights-ai': 'Insights and AI',
  personalise: 'Personalise',
};

const UPDATED = '2026-10-30';
const CTRL_NOTE = 'Use Ctrl instead of ⌘ on Windows.';

export const GUIDES: Guide[] = [
  {
    slug: 'add-a-task',
    title: 'Add a task',
    question: 'How do I add a task in Focalyst?',
    category: 'plan',
    icon: 'ListChecks',
    color: '#3781FC',
    pro: 'none',
    summary: 'Add a to-do with a time, priority, tags and a reminder.',
    answer:
      'On the phone app, open the Plan tab and tap Add new task. On the web, go to Plan, then Tasks, type the task and press Enter, or press N for the full form. You can set a time, a priority, tags and a reminder.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Plan** tab.',
            'Tap **Add new task**.',
            'Type the task name.',
            'Set the start and end time.',
            'Add tags if you like.',
            'Choose a priority: **High**, **Medium** or **Low**.',
            "To be reminded, turn on **Reminder**. You'll get a notification at the start time and at the end time.",
            'Tap **Save task**.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          label: 'Quick add',
          steps: [
            'Go to **Plan**, then **Tasks**.',
            'Type the task name in the box at the top and press [[Enter]].',
            'The box stays ready, so you can type the next task straight away.',
          ],
        },
        {
          label: 'With all the details',
          steps: [
            'On **Plan** › **Tasks**, click **New task**, or press [[N]].',
            'Add the title, due date, priority and tags.',
            'Click the check button to save it.',
          ],
        },
      ],
    },
    goodToKnow: [
      'You can also add a task from anywhere on the web with **+ New** › **New task** in the top bar.',
      'Task reminders need notifications turned on for Focalyst on your phone.',
    ],
    related: ['reorder-tasks', 'start-a-focus-session', 'add-a-calendar-event'],
    keywords: ['task', 'to-do', 'todo', 'add task', 'reminder', 'priority', 'tags'],
    updated: UPDATED,
  },
  {
    slug: 'reorder-tasks',
    title: 'Reorder your tasks',
    question: 'How do I change the order of my tasks?',
    category: 'plan',
    icon: 'GripVertical',
    color: '#3781FC',
    pro: 'none',
    summary: 'Drag tasks up or down to put the most important first.',
    answer:
      'Drag them. On the phone app, touch and hold the three-line handle next to a task in your to-do list, then move it up or down. On the web, go to Plan, then Tasks, and drag the task to its new place.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Plan** tab.',
            'In your to-do list, touch and hold the three-line handle (≡) next to a task.',
            'Drag it up or down.',
            'Let go where you want it.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Plan**, then **Tasks**.',
            'Click and hold a task.',
            'Drag it up or down and let go.',
          ],
        },
      ],
    },
    related: ['add-a-task', 'start-a-focus-session', 'add-a-habit'],
    keywords: ['reorder', 'rearrange', 'sort', 'drag', 'move task', 'order'],
    updated: UPDATED,
  },
  {
    slug: 'add-a-habit',
    title: 'Add a habit',
    question: 'How do I add a habit in Focalyst?',
    category: 'plan',
    icon: 'Repeat',
    color: '#34D399',
    pro: 'partly',
    summary: 'Create a habit with an icon, colour, days and reminders.',
    answer:
      'On the phone app, tap Add new habit on the Plan tab. On the web, go to Plan, then Habits, and click New habit. Give it a name, icon and colour, choose the days and dates, and turn on reminders if you want a nudge.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Plan** tab and tap **Add new habit**.',
            'Name the habit.',
            'Choose an icon and a colour.',
            'Set the start date and, if you want one, an end date.',
            'Choose the days, or select every day.',
            "To be reminded, turn on **Reminders**, then pick the time and how long the habit takes. You'll get a reminder at the start time and another when that time is over.",
            'Tap **Save habit**.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Plan**, then **Habits**.',
            'Click **New habit**.',
            'Add the name, icon and colour.',
            'Choose the repeat days, the reminder, and the start and end dates.',
            'Click the check button to save it.',
          ],
        },
      ],
    },
    goodToKnow: [
      'The free plan includes 2 active habits. Pro lets you track more.',
      'You can also use **+ New** › **New habit** in the web top bar.',
    ],
    related: ['habit-progress', 'add-a-task', 'add-widgets'],
    keywords: ['habit', 'habit tracker', 'streak', 'routine', 'daily habit', 'reminder'],
    updated: UPDATED,
  },
  {
    slug: 'habit-progress',
    title: 'See how a habit is going',
    question: 'How do I see my habit streak and completion rate?',
    category: 'plan',
    icon: 'ChartColumn',
    color: '#34D399',
    pro: 'none',
    summary: 'Open a habit to see its heatmap, streaks and completion rate.',
    answer:
      'Open the habit. On the phone app, tap it in your active habits on the Plan tab to see its heatmap, completion rate and average per day. On the web, go to Plan, then Habits, and click it to see your streak, best streak, completion rate and a month-by-month heatmap.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Plan** tab.',
            'Tap a habit in your active habits.',
            "You'll see its heatmap, completion rate and average completion per day.",
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Plan**, then **Habits**.',
            "Click the habit's name.",
            'The details open on the right: current streak, best streak, completion rate and a heatmap of the year, month by month.',
            'To close the details, click **Close panel** at the top of the details or press [[⌘ .]].',
          ],
        },
      ],
      notes: [CTRL_NOTE],
    },
    related: ['add-a-habit', 'check-your-insights', 'add-widgets'],
    keywords: ['habit streak', 'heatmap', 'completion rate', 'habit stats', 'progress', 'consistency'],
    updated: UPDATED,
  },
  {
    slug: 'add-a-calendar-event',
    title: 'Add a calendar event',
    question: 'How do I add an event or reminder to my Focalyst calendar?',
    category: 'plan',
    icon: 'CalendarPlus',
    color: '#A78BFA',
    pro: 'none',
    summary: 'Add events with tags, colours, times and repeats, and get reminded.',
    answer:
      "On the phone app, open Plan, then Calendar, pick a date and tap Add reminder. On the web, press N or use + New in the top bar and choose New reminder. Add a name, time, tags, colour and repeat, then save. You'll be reminded before the event.",
    phone: {
      methods: [
        {
          steps: [
            'Open the **Plan** tab and tap **Calendar**.',
            'Pick the date.',
            'Tap **Add reminder**.',
            'Write the name and a short description if you like.',
            'Add tags: **Health**, **Work**, **Urgent**, **Study** or **Personal**.',
            'Choose a colour.',
            'Turn on **All day**, or set the start and end time.',
            'Choose how it repeats, if it does.',
            'Tap **Add**.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'On **Today**, press [[N]], or click **+ New** in the top bar, and choose **New reminder**.',
            'Add the name and choose the dates.',
            'Set the start and end time, how it repeats, tags and a colour.',
            'Click the check button to save it.',
          ],
        },
      ],
    },
    goodToKnow: [
      "With reminder notifications turned on, you're alerted 3 days before, 24 hours before, and when the event starts.",
      'On the web you can also go to **Plan** › **Calendar** and click **+ New reminder**.',
    ],
    related: ['add-a-countdown', 'add-a-task', 'add-widgets'],
    keywords: ['calendar', 'event', 'reminder', 'schedule', 'repeat', 'notification'],
    updated: UPDATED,
  },
  {
    slug: 'start-a-focus-session',
    title: 'Start a focus session',
    question: 'How do I start a Pomodoro focus session in Focalyst?',
    category: 'focus',
    icon: 'Timer',
    color: '#22D3EE',
    pro: 'partly',
    summary: 'Start a Pomodoro timer, link it to a task, and take breaks on time.',
    answer:
      "Open Focus. On the phone app, set your focus time, break and sets, or pick a preset, then tap Start. On the web, choose what you're working on and press play. Breaks start automatically. Free accounts use 25 minutes of focus, 5 minutes of break and 4 sets.",
    phone: {
      methods: [
        {
          steps: [
            'Open the **Focus** tab.',
            'At the top, in the Pomodoro section, choose your focus time, break time and number of sets, or pick one of the presets.',
            'Tap **Start**.',
            'While it runs you can **Pause** or **End** the session.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Focus**.',
            'Pick a preset if you like.',
            'To track time on a task, open **What are you working on?** and choose one of your tasks.',
            'Press the play button.',
            'When a focus round ends, the short break starts automatically, then the next round.',
          ],
        },
      ],
    },
    goodToKnow: [
      'Free accounts get the 25/5 timer with 4 sets. The other presets and custom timers are part of Pro.',
      'On the web, press [[F]] for desk mode, a full screen with just your timer and a clock. Press [[Esc]] to leave.',
      'On the phone app you can block distracting apps automatically when a session starts.',
    ],
    related: ['block-distracting-apps', 'add-a-task', 'check-your-insights'],
    keywords: ['pomodoro', 'focus timer', 'focus session', 'study timer', 'deep work', 'break'],
    updated: UPDATED,
  },
  {
    slug: 'block-distracting-apps',
    title: 'Block distracting apps',
    question: 'How do I block distracting apps with Focalyst?',
    category: 'focus',
    icon: 'ShieldCheck',
    color: '#F87171',
    pro: 'partly',
    summary: 'Pause the apps that pull you away, now, on a schedule, or during focus.',
    answer:
      'Blocking works in the Focalyst phone app. Open the Focus tab and tap Block distractions, allow access, pick the apps and choose a mode: Gentle, Firm or Locked. Then use Block now, set a schedule in Manage, or turn on App lock when focus starts.',
    phone: {
      methods: [
        {
          label: 'Set it up (first time)',
          steps: [
            'Open the **Focus** tab and tap **Block distractions**.',
            'Follow the setup. On iPhone, allow Screen Time access and confirm with Face ID or your passcode. On Android, allow the permissions the app asks for.',
            'Choose the apps you want to block.',
            'Choose a mode: **Gentle**, **Firm** or **Locked**.',
          ],
        },
        {
          label: 'Block right now',
          steps: ['On the **Focus** tab, tap **Block now**.'],
        },
        {
          label: 'Set a duration, a schedule or allowed apps',
          steps: [
            'On the **Focus** tab, tap **Manage**.',
            'Set how long it lasts, schedule it, or choose which apps are still allowed.',
          ],
        },
        {
          label: 'Block during every focus session',
          steps: ['On the **Focus** tab, turn on **App lock when focus starts**.'],
        },
      ],
    },
    web: {
      unavailable:
        "Blocking works in the Focalyst phone app only, because a website can't control other apps. Download Focalyst from the App Store or Google Play to use it.",
    },
    goodToKnow: [
      'Gentle mode is free. Firm and Locked are part of Pro.',
      'Insights shows how many times you unblocked and the reasons you gave.',
    ],
    related: ['start-a-focus-session', 'check-your-insights', 'add-widgets'],
    keywords: [
      'app blocker',
      'block apps',
      'screen time',
      'distraction blocker',
      'focus mode',
      'social media blocker',
    ],
    updated: UPDATED,
  },
  {
    slug: 'add-a-countdown',
    title: 'Add a countdown',
    question: 'How do I add a countdown to an exam or event?',
    category: 'focus',
    icon: 'Hourglass',
    color: '#FB923C',
    pro: 'partly',
    summary: 'Count down the days to an exam, launch or trip.',
    answer:
      'On the phone app, open the Focus tab, scroll down to Countdown and tap Add new. On the web, click Add countdown on the Today page. Name it, choose the date and time, turn on the reminder if you want one, and save.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Focus** tab and scroll down to **Countdown**.',
            'Tap **Add new**.',
            'Name it and choose the date and time.',
            'To be notified on the day, turn on **Reminders**.',
            'Tap **Save**.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Today**.',
            'Click **Add countdown**.',
            'Name it and choose the date and time.',
            'Turn on the reminder if you want one, then save.',
          ],
        },
      ],
    },
    goodToKnow: [
      'On the free plan you can have 1 countdown, up to 30 days away. Pro removes the date limit and lets you add more.',
      "You can put a countdown on your phone's home screen with the countdown widget.",
    ],
    related: ['add-a-calendar-event', 'add-widgets', 'start-a-focus-session'],
    keywords: ['countdown', 'exam countdown', 'days left', 'event timer', 'deadline'],
    updated: UPDATED,
  },
  {
    slug: 'write-a-note',
    title: 'Write a note',
    question: 'How do I write a note in Focalyst?',
    category: 'notes',
    icon: 'NotebookPen',
    color: '#FBBF24',
    pro: 'none',
    summary: 'Start a note on your phone or the web and write straight away.',
    answer:
      'On the phone app, open the Notes tab, tap New note, give it a name and tap Create. On the web, press N on the Notes page, click New note, or use + New in the top bar. The editor opens and you can start writing.',
    phone: {
      methods: [
        {
          steps: [
            'Open the **Notes** tab.',
            'Tap **New note**.',
            'Name it and tap **Create**.',
            'The editor opens. Start writing.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Use any of these: click **+ New** › **New note** in the top bar, go to **Notes** and click **New note**, or press [[N]] on the Notes page.',
            'The editor opens. Start writing straight away.',
          ],
        },
      ],
    },
    related: ['record-a-voice-note', 'ask-focalyst-ai', 'add-a-task'],
    keywords: ['notes', 'write note', 'note taking', 'editor', 'journal'],
    updated: UPDATED,
  },
  {
    slug: 'record-a-voice-note',
    title: 'Record a voice note',
    question: 'How do I record a voice note and get a transcript?',
    category: 'notes',
    icon: 'Mic',
    color: '#F472B6',
    pro: 'partly',
    summary: 'Record your thoughts and get a transcript and summary.',
    answer:
      'On the phone app, tap the central Add button and choose Voice, or open Notes and tap Voice notes. When you tap the red stop button, Focalyst writes a transcript and a summary. On the web, go to Notes, choose Voice notes and click the mic.',
    phone: {
      methods: [
        {
          label: 'The quickest way',
          steps: [
            'Tap the **Add** button in the middle of the bottom bar.',
            'Tap **Voice**. Recording starts straight away.',
          ],
        },
        {
          label: 'From Notes',
          steps: ['Open the **Notes** tab and tap **Voice notes**.', 'Start recording.'],
        },
        {
          label: 'While recording',
          steps: [
            'Use **Pause** to take a break, or **Discard** to throw it away.',
            "Tap the red **Stop** button when you're done. You'll get the transcript and a short summary.",
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Notes** and choose **Voice notes**.',
            'Click the mic icon and allow microphone access if your browser asks.',
            'Speak, then click **Stop and save** to get the transcript and summary.',
          ],
        },
      ],
    },
    goodToKnow: ['The free plan includes a limited number of voice notes. Pro gives you more.'],
    related: ['write-a-note', 'ask-focalyst-ai', 'connect-ai-apps'],
    keywords: ['voice note', 'voice memo', 'transcript', 'transcription', 'summary', 'dictation'],
    updated: UPDATED,
  },
  {
    slug: 'check-your-insights',
    title: 'Check your insights',
    question: 'Where can I see my focus time, streaks and weekly report?',
    category: 'insights-ai',
    icon: 'ChartColumn',
    color: '#60A5FA',
    pro: 'partly',
    summary: 'See your level, focus time, habits, distractions and weekly report.',
    answer:
      "Open the Insights tab on the phone app or Insights on the web. You'll see your level, tasks completed, focus time, productivity score, focus charts, habits, the group leaderboard and your distraction stats. The weekly report arrives on Sundays. The web also lets you pick a date range.",
    phone: {
      methods: [
        {
          steps: [
            'Open the **Insights** tab.',
            "You'll find your current level, tasks completed, total focus time and productivity score.",
            'Scroll for weekly and monthly focus charts, your active habits and total days, and the habit leaderboard.',
            'The distraction card shows your sessions and timings for the last 7 and 30 days, how many times you unblocked, and why.',
            'At the end is your weekly productivity report. It arrives on Sundays and covers the last 7 days.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Go to **Insights**.',
            "You'll see the same insights, plus your productivity score broken down into habits, tasks and focus, your best focus times, and highlights like your best day, longest session, average session and active days.",
            'Choose a date range or a month at the top to see a different period.',
            'Your Catalyst report is at the bottom.',
          ],
        },
      ],
    },
    goodToKnow: [
      'Some insights, like the productivity score and the detailed Catalyst report, are part of Pro.',
    ],
    related: ['habit-progress', 'start-a-focus-session', 'ask-focalyst-ai'],
    keywords: [
      'insights',
      'statistics',
      'stats',
      'focus time',
      'productivity score',
      'weekly report',
      'analytics',
    ],
    updated: UPDATED,
  },
  {
    slug: 'ask-focalyst-ai',
    title: 'Ask Focalyst AI',
    question: 'How do I use Focalyst AI?',
    category: 'insights-ai',
    icon: 'Sparkles',
    color: '#818CF8',
    pro: 'partly',
    summary: 'Ask questions about your week, add tasks and get advice from your data.',
    answer:
      'On the phone app, tap the chat icon at the top right. On the web, click Ask Focalyst AI in the sidebar or press ⌘ J. Pick a suggested question, type your own, or use the mic. Focalyst AI answers from your own tasks, habits and focus data.',
    phone: {
      methods: [
        {
          steps: [
            'Tap the chat icon in the top right corner.',
            'Choose a suggested question, type your own, or tap the mic to dictate it.',
            'Send it. Focalyst AI answers from your own data.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          steps: [
            'Click **Ask Focalyst AI** in the sidebar, or press [[⌘ J]].',
            'The AI panel opens on the right.',
            'Type or dictate your question and send it.',
          ],
        },
      ],
      notes: [CTRL_NOTE],
    },
    goodToKnow: [
      'Free accounts get 5 AI messages a day. Pro gives you more.',
      'Want to use Claude or ChatGPT instead? See **Connect Claude, ChatGPT or Gemini**.',
    ],
    related: ['connect-ai-apps', 'check-your-insights', 'write-a-note'],
    keywords: ['AI assistant', 'AI chat', 'Focalyst AI', 'productivity coach', 'ask AI'],
    updated: UPDATED,
  },
  {
    slug: 'add-widgets',
    title: 'Add home screen widgets',
    question: 'How do I add Focalyst widgets to my home screen?',
    category: 'personalise',
    icon: 'LayoutGrid',
    color: '#2DD4BF',
    pro: 'none',
    summary: 'Put your tasks, habits, timer and countdown on your home screen.',
    answer:
      'Widgets are part of the phone app. Open your profile, turn on Home Screen Widgets under Preferences and pick a theme. Then, on iPhone, touch and hold the home screen, tap Edit, then Add Widget, search for Focalyst and add the one you want.',
    phone: {
      methods: [
        {
          label: 'Turn widgets on in Focalyst',
          steps: [
            'Tap your profile picture in the top left corner.',
            'Scroll down to **Preferences** and turn on **Home Screen Widgets**.',
            'Tap it to choose a colour theme and see every widget.',
          ],
        },
        {
          label: 'Add one on iPhone',
          steps: [
            'Touch and hold an empty part of your home screen.',
            'Tap **Edit**, then **Add Widget**.',
            'Search for **Focalyst** and tap it.',
            'Pick a widget and size, tap **Add Widget**, and place it where you like.',
          ],
        },
        {
          label: 'Add one on Android',
          steps: [
            'Touch and hold an empty part of your home screen.',
            'Tap **Widgets**.',
            'Find **Focalyst**, then touch and hold a widget and drag it into place.',
          ],
        },
      ],
    },
    web: {
      unavailable:
        'Widgets are part of the Focalyst phone app. Download it from the App Store or Google Play.',
    },
    goodToKnow: [
      'Tap tasks and habits on the widget to tick them off without opening the app.',
      'Widgets work in every home screen style, including Clear and Tinted on iPhone.',
    ],
    related: ['add-a-habit', 'add-a-countdown', 'start-a-focus-session'],
    keywords: ['widget', 'home screen widget', 'iPhone widget', 'Android widget', 'habit widget'],
    updated: UPDATED,
  },
  {
    slug: 'dark-mode',
    title: 'Switch to dark mode',
    question: 'How do I turn on dark mode in Focalyst?',
    category: 'personalise',
    icon: 'Moon',
    color: '#CBD5E1',
    pro: 'none',
    summary: 'Choose light, dark or match your device.',
    answer:
      'On the phone app, open your profile and turn on Dark Mode under General. On the web, use the sun and moon switch at the bottom of the sidebar, or go to Settings, then Appearance, and choose Light, Dark or System.',
    phone: {
      methods: [
        {
          steps: [
            'Tap your profile picture in the top left corner.',
            'Scroll to **General** and turn on **Dark Mode**.',
          ],
        },
      ],
    },
    web: {
      methods: [
        {
          label: 'The quick switch',
          steps: ['In the sidebar, just above your name, click the moon (dark) or the sun (light).'],
        },
        {
          label: 'In Settings',
          steps: [
            'Go to **Settings** › **Appearance**.',
            'Under **Theme**, choose **Light**, **Dark** or **System**.',
          ],
        },
      ],
    },
    related: ['change-language', 'add-widgets'],
    keywords: ['dark mode', 'light mode', 'theme', 'appearance', 'night mode'],
    updated: UPDATED,
  },
  {
    slug: 'change-language',
    title: 'Change the language',
    question: 'How do I change the language in Focalyst?',
    category: 'personalise',
    icon: 'Languages',
    color: '#CBD5E1',
    pro: 'none',
    summary: 'Use the phone app in your preferred language.',
    answer:
      'In the phone app, open your profile, scroll to General and tap Language. Tap the current language and choose the one you want. The app switches straight away.',
    phone: {
      methods: [
        {
          steps: [
            'Tap your profile picture in the top left corner.',
            'Scroll to **General** and tap **Language**.',
            'Tap the current language (for example **English**) and choose yours.',
          ],
        },
      ],
    },
    web: {
      unavailable: 'Language settings are in the phone app for now.',
    },
    related: ['dark-mode', 'add-widgets'],
    keywords: ['language', 'change language', 'translation', 'app language'],
    updated: UPDATED,
  },
  {
    slug: 'connect-ai-apps',
    title: 'Connect Claude, ChatGPT or Gemini',
    question: 'How do I connect Focalyst to Claude, ChatGPT or Gemini?',
    category: 'insights-ai',
    icon: 'Plug',
    color: '#818CF8',
    pro: 'only',
    summary: 'Let your AI app read your plan and add tasks for you (Pro).',
    answer:
      'With Pro, open Settings, then AI connections on the web, copy your Focalyst connector URL and add it to Claude, ChatGPT or Gemini, following the steps shown there. On the phone app, open your profile and tap Connect MCP to get there. Sign in with your Focalyst account when asked.',
    web: {
      methods: [
        {
          steps: [
            'Click **Settings** in the sidebar and open **AI connections**.',
            'Copy the **connector URL**.',
            'Below it, open the steps for **Claude**, **ChatGPT** or **Gemini** and follow them in that AI app.',
            'When the AI app asks you to sign in to Focalyst, use the same Focalyst account you use in the app, and approve the connection.',
          ],
        },
      ],
    },
    phone: {
      methods: [
        {
          steps: [
            'Tap your profile picture in the top left corner.',
            'Scroll to the **MCP** section and tap **Connect MCP**.',
            'The Focalyst website opens on the same page. Copy the **connector URL** and follow the steps for your AI app.',
          ],
        },
      ],
    },
    goodToKnow: [
      'AI connections are part of Pro. They include 500 credits a month, plus 10 for each day you open Focalyst. Credits refill on your billing date.',
      'Your AI app sees only your own Focalyst data, and you can disconnect it any time in **AI connections**.',
      "Gemini's custom connections are only available on some Google accounts. The setup steps say which.",
    ],
    related: ['ask-focalyst-ai', 'check-your-insights', 'record-a-voice-note'],
    keywords: ['MCP', 'Claude', 'ChatGPT', 'Gemini', 'AI connector', 'integrations', 'connect AI'],
    updated: UPDATED,
  },
];

export const GUIDES_BY_SLUG: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));

export function getGuide(slug: string): Guide | undefined {
  return GUIDES_BY_SLUG[slug];
}
