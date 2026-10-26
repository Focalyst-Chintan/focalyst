export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  name: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting started',
    items: [
      {
        id: 'what-is-focalyst',
        question: 'What is Focalyst?',
        answer:
          'Focalyst is an all-in-one productivity app for web, iOS and Android. It brings tasks, habits, a Pomodoro focus timer, an app blocker on mobile, notes, voice notes, accountability groups and Focalyst AI into one calm workspace, so you can plan your day, focus deeply and see how you are growing without switching between apps.',
      },
      {
        id: 'which-devices',
        question: 'Which devices can I use?',
        answer:
          'Focalyst works in any modern browser at focalyst.online, on your phone, tablet or computer. Sign in with the same account and your data stays in sync everywhere.',
      },
      {
        id: 'create-account',
        question: 'How do I create an account?',
        answer:
          'Choose Get started, then sign in with Google, Apple or your email and a password.',
      },
    ],
  },
  {
    id: 'plans-and-billing',
    name: 'Plans and billing',
    items: [
      {
        id: 'is-focalyst-free',
        question: 'Is Focalyst free?',
        answer:
          'Yes. The Free plan includes habits, tasks, the calendar, focus sessions with the classic 25 minute timer, notes, voice notes, Insights and habit groups, with lower limits than Pro.',
      },
      {
        id: 'what-is-in-pro',
        question: 'What do I get with Pro?',
        answer:
          'Pro gives you more habits, notes and voice notes; higher daily limits for Focalyst AI (Free includes 5 messages a day); your productivity score; the detailed weekly Catalyst Report on your strengths and weaknesses; custom focus timers and every preset (Free uses 25 and 5 only); up to 3 countdowns (Free includes 1); and MCP, to connect Focalyst to your favourite AI assistant, when it launches.',
      },
      {
        id: 'pro-cost',
        question: 'How much does Pro cost?',
        answer:
          'Pro Monthly is $4.99, Pro Annual is $39.99 and Lifetime is a one-time $99.99. In India, Pro is ₹99 a month, ₹999 a year or ₹2,999 for Lifetime. Taxes may apply at checkout.',
      },
      {
        id: 'payment-processor',
        question: 'Who processes payments?',
        answer:
          'Payments are handled securely by Polar. Focalyst never sees or stores your card details.',
      },
      {
        id: 'cancel-pro',
        question: 'How do I cancel?',
        answer:
          'You can cancel a monthly or annual plan at any time. You keep Pro until the end of the period you paid for, and you will not be charged again. Lifetime is a one-time payment, so there is nothing to cancel.',
      },
      {
        id: 'refunds',
        question: 'Can I get a refund?',
        answer:
          'Yes, within the windows described in the Refunds section of our Terms of Service. Email contactfocalyst@gmail.com from the address you used to pay.',
      },
    ],
  },
  {
    id: 'focus-and-timers',
    name: 'Focus and timers',
    items: [
      {
        id: 'focus-minutes',
        question: 'How are focus minutes counted?',
        answer:
          'Every focus session counts from the moment you start it. If you end, reset or skip a session after at least one minute, the time you focused is still saved. Breaks are not counted as focus time.',
      },
      {
        id: 'custom-timers',
        question: 'Can I set my own timer lengths?',
        answer:
          'Custom timers and the longer presets are part of Pro. Free includes the classic 25 minute focus and 5 minute break.',
      },
      {
        id: 'countdowns',
        question: 'What are countdowns?',
        answer:
          'Countdowns show how many days are left until a date that matters, like an exam or a launch. Free includes 1 countdown and Pro includes up to 3.',
      },
      {
        id: 'desk-mode',
        question: 'What is desk mode?',
        answer:
          'On a computer, press F on the Focus page to go full screen with just your timer and a clock. Press Esc to leave.',
      },
    ],
  },
  {
    id: 'habits-tasks-and-calendar',
    name: 'Habits, tasks and calendar',
    items: [
      {
        id: 'what-is-streak',
        question: 'What is a streak?',
        answer:
          'A streak counts how many scheduled days in a row you completed a habit. Missing a scheduled day resets it.',
      },
      {
        id: 'levels-and-xp',
        question: 'How do levels and XP work?',
        answer:
          'You earn XP by staying consistent in Focalyst. XP moves you through 15 levels, starting at Ignition, and you can follow your progress and the full roadmap in Insights.',
      },
      {
        id: 'repeating-reminders',
        question: 'Can reminders repeat?',
        answer:
          'Yes. Reminders can repeat on a schedule, such as every day, every week or every month.',
      },
    ],
  },
  {
    id: 'notes-and-voice',
    name: 'Notes and voice',
    items: [
      {
        id: 'voice-notes',
        question: 'How do voice notes work?',
        answer:
          'Record a voice note and Focalyst turns your speech into text, then writes a short AI summary. The transcript and summary are saved with your note so you can search and edit them.',
      },
      {
        id: 'note-limits',
        question: 'Is there a limit on notes?',
        answer:
          'Free includes a set number of notes and voice notes. Pro raises those limits.',
      },
    ],
  },
  {
    id: 'focalyst-ai-and-privacy',
    name: 'Focalyst AI and privacy',
    items: [
      {
        id: 'what-can-ai-do',
        question: 'What can Focalyst AI do?',
        answer:
          'Ask about your week, add a task, get a summary of your habits or plan your next steps. It uses your tasks, habits, notes and focus sessions as context, so its answers are about you.',
      },
      {
        id: 'ai-privacy',
        question: 'Does the AI see my data?',
        answer:
          'Only to answer you. When you chat with Focalyst AI, the relevant parts of your data are sent securely to our AI provider to generate a reply. Chats are kept for 90 days and then deleted. We never sell your data. Read more in our Privacy Policy.',
      },
      {
        id: 'ai-mistakes',
        question: 'Can the AI make mistakes?',
        answer:
          'Yes. AI can be wrong. Treat its suggestions as guidance, not as professional, medical, legal or financial advice.',
      },
    ],
  },
  {
    id: 'accountability-groups',
    name: 'Accountability groups',
    items: [
      {
        id: 'how-groups-work',
        question: 'How do habit groups work?',
        answer:
          'Create a group or join one with a 6 character code. Members see each other\'s name, chosen habit and streak on a shared leaderboard. Your notes, tasks and everything else stay private.',
      },
      {
        id: 'leave-group',
        question: 'How do I leave a group?',
        answer:
          'Open Plan, go to Habits, and in Accountability open the menu next to the group, then choose Leave group.',
      },
    ],
  },
  {
    id: 'account-and-data',
    name: 'Account and data',
    items: [
      {
        id: 'export-data',
        question: 'Can I export my data?',
        answer:
          'Yes. Email contactfocalyst@gmail.com with the subject "Data export" and we will send you a copy of your data.',
      },
      {
        id: 'delete-account',
        question: 'How do I delete my account?',
        answer:
          'Email contactfocalyst@gmail.com from your account email with the subject "Delete my account", or use Delete account in Settings if you see it there. Deleting your account permanently removes your data. We do not keep backups of deleted accounts.',
      },
    ],
  },
];
