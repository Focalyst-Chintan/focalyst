export interface FAQQuestion {
  question: string;
  answer: string;
}

export interface FAQCategory {
  title: string;
  items: FAQQuestion[];
}

export interface LegalSection {
  title: string;
  content: string[];
}

export const FAQ_DATA: FAQCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'What is Focalyst?',
        answer: 'Focalyst is an all-in-one productivity app that helps you manage tasks, build habits, focus deeply with Pomodoro timers, capture notes, and track your progress — all in one place. It is powered by Gemini AI to give you personalised productivity insights.',
      },
      {
        question: 'How do I create an account?',
        answer: 'Open Focalyst and tap "Create account" on the welcome screen. You can sign up using your Google account or with your email address. First-time users are guided through a short onboarding flow to personalise the experience.',
      },
      {
        question: 'Is Focalyst free to use?',
        answer: 'Yes. Focalyst has a free plan that includes unlimited tasks, 2 habit trackers, 4 Pomodoro presets, 1 countdown, 5 notes, basic weekly insights, and 5 AI chat messages per day. Upgrade to Pro or Lifetime for unlimited access to all features.',
      },
      {
        question: 'Which devices can I use Focalyst on?',
        answer: 'Focalyst is a web application that works on any browser on mobile and desktop. It is optimised for mobile screens. A native Android and iOS app is coming soon.',
      },
    ],
  },
  {
    title: 'Plans & Billing',
    items: [
      {
        question: 'What plans does Focalyst offer?',
        answer: '• Free — ₹0, core features with limits\n• Pro Monthly — ₹99/month, all features unlocked\n• Pro Yearly — ₹999/year (save 16%), all features unlocked\n• Lifetime — ₹2,999 one-time payment, all current and future features forever',
      },
      {
        question: 'How do I upgrade to Pro?',
        answer: 'Go to your Profile page by tapping the avatar icon in the top-left corner. Tap "Upgrade Plan" inside the My Plan card. Select your preferred plan and complete payment via Razorpay. Your plan activates instantly after payment.',
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'Payments are processed securely by Razorpay. You can pay using UPI, debit card, credit card, net banking, or wallets.',
      },
      {
        question: 'Can I cancel my Pro subscription?',
        answer: 'Yes. Tap your avatar → My Plan → Manage Plan → Cancel Subscription. Your Pro access continues until the end of your current billing period. We do not offer refunds for the unused portion of a subscription.',
      },
      {
        question: 'What happens to my data if I cancel?',
        answer: 'All your tasks, habits, notes, and history remain saved in your account. You simply lose access to Pro features and return to free plan limits. Your data is never deleted when you downgrade.',
      },
      {
        question: 'Does the Lifetime plan include future features?',
        answer: 'Yes. Lifetime plan holders get all future features included at no extra cost, including the upcoming mobile app and App Blocker feature.',
      },
      {
        question: 'I was charged but my plan did not activate. What do I do?',
        answer: 'Contact us at contactfocalyst@gmail.com with your payment receipt. We will resolve this within 24 hours.',
      },
    ],
  },
  {
    title: 'Tasks & Habits',
    items: [
      {
        question: 'How do I add a task?',
        answer: 'On the Plan tab, tap "+ Add new task" or tap the + button in the centre of the bottom navigation and select "Task". Enter the task title, set an optional due date, priority level, and reminder, then tap Save.',
      },
      {
        question: 'How do I mark a task as complete?',
        answer: 'Tap the checkbox to the left of the task name. Completed tasks are removed from your list and counted in your Insights.',
      },
      {
        question: 'Can I reorder my tasks?',
        answer: 'Yes. Press and hold a task row and drag it up or down to reprioritise your list.',
      },
      {
        question: 'What is the difference between a task and a habit?',
        answer: 'A task is a one-time to-do item. A habit is a recurring activity you want to do every day or on specific days of the week. Habits track your streak — how many days in a row you have completed them.',
      },
      {
        question: 'How does the streak work?',
        answer: 'Your streak increases by 1 each day you complete a habit. If you miss a day, the streak resets to 0. Streaks are shown on the Insights tab.',
      },
      {
        question: 'Why can I only add 2 habits on the free plan?',
        answer: 'The free plan includes 2 active habits. Upgrade to Pro for unlimited habits.',
      },
    ],
  },
  {
    title: 'Focus (Pomodoro Timer)',
    items: [
      {
        question: 'What is a Pomodoro timer?',
        answer: 'The Pomodoro technique is a time management method where you focus for a set period, then take a short break, and repeat. Focalyst supports custom durations and multiple sets.',
      },
      {
        question: 'What are the preset options?',
        answer: '• 25 minutes focus / 5 minutes break × 4 sets\n• 45 minutes focus / 10 minutes break × 3 sets\n• 60 minutes focus / 15 minutes break × 2 sets\n• 90 minutes focus / 30 minutes break × 2 sets\n\nFree plan users can only use these presets. Pro users can set any custom duration.',
      },
      {
        question: 'Can I use custom focus durations on the free plan?',
        answer: 'No. Custom durations require a Pro or Lifetime plan. The input fields are locked on the free plan with a "Upgrade to Pro" indicator.',
      },
      {
        question: 'Will my screen stay on during a focus session?',
        answer: 'Yes. Focalyst uses the WakeLock API to keep your screen active during an active Pomodoro session so the timer is never interrupted.',
      },
      {
        question: 'What is a Day Countdown?',
        answer: 'A countdown is a card that shows how many days remain until an event — for example, an exam, deadline, or trip. Free plan supports 1 countdown up to 30 days away. Pro supports unlimited countdowns at any future date.',
      },
    ],
  },
  {
    title: 'Notes',
    items: [
      {
        question: 'How do I create a note?',
        answer: 'Go to the Notes tab and tap "+ New note", or tap the + button in the bottom navigation and select "Note". A blank editor opens immediately.',
      },
      {
        question: 'Does Focalyst support rich text formatting?',
        answer: 'Yes. The note editor supports bold, italic, underline, headings (H1, H2), bullet lists, numbered lists, and checklists.',
      },
      {
        question: 'Can I use voice to write notes?',
        answer: 'Yes. Tap the microphone icon in the note editor toolbar to start speech-to-text. Speak naturally and your words appear at the cursor position. This uses your device\'s built-in speech recognition — no data is sent to any external server. English only.',
      },
      {
        question: 'Are my notes saved automatically?',
        answer: 'Yes. Notes auto-save every 30 seconds and also save when you navigate away from the editor. You will see a "Saving..." indicator at the top of the screen while this happens.',
      },
      {
        question: 'Can I download my notes?',
        answer: 'Yes. Open the three-dot menu on any note and tap "Download as PDF". A PDF file is generated on your device and downloaded to your browser\'s default download folder.',
      },
      {
        question: 'Why can I only have 5 notes on the free plan?',
        answer: 'The free plan includes 5 notes. Upgrade to Pro for unlimited notes. Your existing notes are never deleted when you reach the limit — you simply cannot create new ones until you upgrade.',
      },
    ],
  },
  {
    title: 'AI Chat',
    items: [
      {
        question: 'What can the AI assistant do?',
        answer: 'The Focalyst AI assistant is powered by Google Gemini. It can add tasks for you, set reminders, summarise your week\'s productivity, answer general productivity questions, and give personalised suggestions based on your data.',
      },
      {
        question: 'How do I open the AI chat?',
        answer: 'Tap the chat icon in the top-right corner of any screen. On mobile it opens as a bottom sheet. On desktop it opens as a right-side panel.',
      },
      {
        question: 'Does the AI have access to my personal data?',
        answer: 'The AI receives a summary of your current tasks, habits, and focus data to give you relevant answers. This data is passed securely through our server and is never stored by Google or used to train AI models.',
      },
      {
        question: 'How many AI messages can I send per day?',
        answer: 'Free plan: 5 messages per day (resets at midnight). Pro and Lifetime plans: unlimited messages.',
      },
      {
        question: 'Why is the AI giving me generic answers?',
        answer: 'Make sure you have some tasks and habits set up — the AI\'s responses are more personalised when it has your data to reference. Try prompts like "How productive was I this week?" or "What should I focus on today?"',
      },
    ],
  },
  {
    title: 'Account & Privacy',
    items: [
      {
        question: 'How do I edit my name or profile type?',
        answer: 'Go to your Profile page (tap the avatar in the top-left corner) and tap "Edit Profile". You can change your display name and profile type (Student, Freelancer, Creator, Working Professional, Entrepreneur).',
      },
      {
        question: 'How do I turn off notifications?',
        answer: 'Go to Profile → Preferences. You can toggle Task Reminders, Habit Reminders, and Pomodoro Alerts on or off individually.',
      },
      {
        question: 'How do I delete my account?',
        answer: 'Go to Profile → scroll to the bottom → tap "Delete my account". You will be asked to confirm. Deleting your account permanently removes all your data including tasks, habits, notes, and insights. This action cannot be undone.',
      },
      {
        question: 'How do I log out?',
        answer: 'Go to Profile → scroll to the very bottom → tap "Log out".',
      },
      {
        question: 'I forgot which email I used to sign up. What do I do?',
        answer: 'If you signed up with Google, try signing in with "Continue with Google" — it will match your Google account automatically. If you used email, contact us at contactfocalyst@gmail.com.',
      },
    ],
  },
  {
    title: 'Technical',
    items: [
      {
        question: 'Focalyst is not loading. What should I do?',
        answer: 'Try these steps in order:\n1. Refresh the page\n2. Clear your browser cache (Settings → Clear browsing data)\n3. Try a different browser (Chrome or Safari recommended)\n4. Check your internet connection\n5. If the issue persists, contact us at contactfocalyst@gmail.com',
      },
      {
        question: 'My data is not syncing across devices. What should I do?',
        answer: 'Make sure you are logged in with the same account on both devices. All data syncs through Supabase in real time. If data is missing, try logging out and logging back in.',
      },
      {
        question: 'Speech to text is not working.',
        answer: 'Speech to text uses your browser\'s built-in Web Speech API. Make sure you have granted microphone permissions to the browser. This feature works best in Google Chrome. It is not supported in all browsers — if your browser does not support it, a message will appear.',
      },
      {
        question: 'Is Focalyst available offline?',
        answer: 'Currently, Focalyst requires an internet connection. An offline mode with local caching is planned for a future update.',
      },
    ],
  },
  {
    title: 'Contact',
    items: [
      {
        question: 'How do I contact support?',
        answer: 'Email us at contactfocalyst@gmail.com. We typically respond within 24 hours on business days.',
      },
      {
        question: 'How do I report a bug?',
        answer: 'Email contactfocalyst@gmail.com with the subject line "Bug Report" and describe what happened, which screen you were on, and what device and browser you were using. Screenshots are very helpful.',
      },
      {
        question: 'How do I request a feature?',
        answer: 'We love hearing from users. Email contactfocalyst@gmail.com with the subject "Feature Request" and tell us what you would like to see in Focalyst.',
      },
    ],
  },
];

export const PRIVACY_DATA: LegalSection[] = [
  {
    title: 'Introduction',
    content: [
      'Focalyst • Effective Date: March 1, 2026 • Last Updated: 25 May 2026',
      'This Privacy Policy describes how Focalyst ("we", "our", or "us") collects, uses, stores, and protects your personal information when you use the Focalyst web application ("the App"). By using Focalyst, you agree to the practices described in this policy.',
    ],
  },
  {
    title: '1. Who We Are',
    content: [
      'Focalyst is a productivity application built and operated by Chintan. For any privacy-related questions, contact us at contactfocalyst@gmail.com.',
    ],
  },
  {
    title: '2. Information We Collect',
    content: [
      '2.1 Information You Provide Directly:\n• Account information: Your name and email address, provided when you sign up via Google OAuth or email\n• Profile information: Your profile type (Student, Freelancer, Creator, Working Professional, Entrepreneur) selected during onboarding\n• Tasks: Titles, due dates, priorities, and completion status of tasks you create\n• Habits: Habit names, frequency settings, reminder times, and daily completion logs\n• Notes: Text content and titles of notes you write in the app\n• Countdowns: Event names and target dates you enter\n• AI chat messages: The messages you send to the Focalyst AI assistant',
      '2.2 Information Collected Automatically:\n• Usage data: Which features you use, how frequently, and at what times — used to generate your Insights and Productivity Score\n• Pomodoro session data: Duration, number of sets, and timestamps of focus sessions\n• Device information: Browser type, operating system, and screen size — used for responsive design and bug fixing\n• Log data: Server logs including IP address, request timestamps, and error reports — retained for 30 days for security monitoring',
      '2.3 Information We Do NOT Collect:\n• We do not collect your payment card details. All payment processing is handled entirely by Razorpay. We only receive a confirmation of payment status.\n• We do not collect your microphone audio. Speech-to-text processing happens entirely on your device using your browser\'s built-in Web Speech API. No audio is ever transmitted to our servers.\n• We do not collect your location data.\n• We do not sell your data to advertisers or third parties.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    content: [
      'We use your information solely to:\n• Provide and operate the Focalyst app\n• Personalise your experience based on your profile type and usage patterns\n• Generate your weekly and monthly Insights and Productivity Score\n• Send you task and habit reminders if you have enabled notifications\n• Process subscription payments via Razorpay\n• Respond to your support requests\n• Detect and fix bugs and security vulnerabilities\n• Improve the app based on aggregated, anonymised usage patterns',
      'We do not use your personal data for advertising. We do not share your data with third parties for marketing purposes.',
    ],
  },
  {
    title: '4. AI and Gemini API',
    content: [
      'The Focalyst AI assistant is powered by the Google Gemini API. When you send a message to the AI:',
      '• A summary of your current tasks, habits, and focus data is sent to the Gemini API along with your message so the AI can give you relevant, personalised responses\n• This data is transmitted securely over HTTPS through our server — it is never sent directly from your browser to Google\n• We have configured the Gemini API with zero data retention settings where available, meaning your data is not used by Google to train AI models\n• AI chat logs are stored in our database for 30 days to allow conversation context, after which they are automatically deleted\n• We recommend you do not share sensitive personal information (passwords, financial details, government ID numbers) in the AI chat',
    ],
  },
  {
    title: '5. Data Storage and Security',
    content: [
      '• Your data is stored securely using Supabase (PostgreSQL database hosted on AWS infrastructure)\n• All data is stored in a region within India or the EU, depending on our Supabase project configuration\n• We enforce Row Level Security (RLS) on all database tables — this means our database is configured at the technical level so that each user can only access their own data, even if a bug existed in our application code\n• All data is transmitted using HTTPS encryption\n• Access to production systems is limited to authorised personnel only\n• We never store your passwords — authentication is handled by Supabase Auth using industry-standard protocols',
    ],
  },
  {
    title: '6. Data Retention',
    content: [
      '• Account and profile data: Until you delete your account\n• Tasks, habits, notes, countdowns: Until you delete them or your account\n• Pomodoro and insight data: Until you delete your account\n• AI chat messages: 30 days from message date\n• Server log data: 30 days\n• Payment records: 7 years (required by Indian accounting law)',
    ],
  },
  {
    title: '7. Your Rights',
    content: [
      'You have the following rights regarding your personal data:',
      'Right to access: You may request a copy of all data we hold about you by emailing contactfocalyst@gmail.com.',
      'Right to correction: You can edit your name and profile type directly in the app under Profile → Edit Profile.',
      'Right to deletion: You can permanently delete your account and all associated data by going to Profile → Delete my account. This is irreversible. Payment records required by law are retained for the mandatory period.',
      'Right to data portability: You may request an export of your data in JSON format by emailing contactfocalyst@gmail.com. We will respond within 7 business days.',
      'Right to withdraw consent: You may withdraw consent for non-essential data processing (such as AI personalisation) by contacting us. Note that withdrawing consent for core processing may limit app functionality.',
    ],
  },
  {
    title: '8. Cookies and Local Storage',
    content: [
      'Focalyst uses browser local storage and cookies solely to:\n• Maintain your login session so you do not have to sign in on every visit\n• Store your UI preferences (such as selected filter chips) between sessions',
      'We do not use advertising cookies, tracking pixels, or third-party cookies.',
    ],
  },
  {
    title: '9. Third-Party Services',
    content: [
      'We use the following third-party services to operate Focalyst. Each has their own privacy policy:\n• Supabase: Database and authentication (supabase.com/privacy)\n• Google (Gemini API): AI assistant (policies.google.com/privacy)\n• Razorpay: Payment processing (razorpay.com/privacy)\n• Vercel: App hosting (vercel.com/legal/privacy-policy)',
      'We do not use Google Analytics, Facebook Pixel, or any advertising networks.',
    ],
  },
  {
    title: "10. Children's Privacy",
    content: [
      'Focalyst is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, please contact us at contactfocalyst@gmail.com and we will delete it promptly.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you by displaying a notice in the app and updating the "Last Updated" date at the top of this page. Your continued use of Focalyst after changes are posted constitutes your acceptance of the updated policy.',
    ],
  },
  {
    title: '12. Contact Us',
    content: [
      'For privacy-related questions, data requests, or concerns:\n• Email: contactfocalyst@gmail.com\n• Response time: Within 5 business days',
    ],
  },
];

export const TERMS_DATA: LegalSection[] = [
  {
    title: 'Introduction',
    content: [
      'Focalyst • Effective Date: March 1, 2026 • Last Updated: March 1, 2026',
      'Please read these Terms of Service carefully before using Focalyst. By creating an account or using the app, you agree to be bound by these terms.',
    ],
  },
  {
    title: '1. Acceptance of Terms',
    content: [
      'These Terms of Service ("Terms") form a legally binding agreement between you ("User", "you") and Focalyst ("we", "our", "us"), operated by Chintan. By accessing or using the Focalyst web application at any domain or subdomain associated with Focalyst, you agree to these Terms in full.',
      'If you do not agree to these Terms, you must not use Focalyst.',
    ],
  },
  {
    title: '2. Description of Service',
    content: [
      'Focalyst is a productivity web application offering task management, habit tracking, Pomodoro focus timers, day countdowns, rich text notes, usage insights, and an AI-powered chat assistant. The service is available on a free tier and paid subscription tiers as described on our pricing page.',
    ],
  },
  {
    title: '3. Account Registration',
    content: [
      '3.1 You must create an account to use Focalyst. You may sign up using Google OAuth or a valid email address.',
      '3.2 You must be at least 13 years of age to create an account.',
      '3.3 You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      '3.4 You agree to provide accurate, complete, and current information during registration and to keep your account information updated.',
      '3.5 You must notify us immediately at contactfocalyst@gmail.com if you suspect unauthorised access to your account.',
      '3.6 We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.',
    ],
  },
  {
    title: '4. Acceptable Use',
    content: [
      'You agree to use Focalyst only for lawful, personal productivity purposes. You must not:',
      '• Use the app to store, transmit, or process any illegal content\n• Attempt to reverse engineer, decompile, or extract the source code of the application\n• Use automated scripts, bots, or scraping tools to access or extract data from the app\n• Attempt to circumvent, disable, or interfere with any security features including Row Level Security policies\n• Use the AI assistant to generate harmful, illegal, abusive, or misleading content\n• Share your account credentials with others or allow multiple people to use a single account\n• Resell, sublicense, or commercially exploit the Focalyst service without written permission\n• Upload or transmit malware, viruses, or any malicious code through the app\n• Use the app in any way that could damage, overload, or impair our servers or infrastructure',
    ],
  },
  {
    title: '5. Subscription Plans and Payments',
    content: [
      '5.1 Plans:\n• Free: ₹0, with feature limitations as described on the pricing page\n• Pro Monthly: ₹99 per month, billed monthly\n• Pro Yearly: ₹999 per year, billed annually\n• Lifetime: ₹2,999 one-time payment\n\nFeature entitlements for each plan are detailed in the app and on the pricing page. We reserve the right to modify plan features with reasonable notice.',
      '5.2 Payment Processing:\nAll payments are processed by Razorpay. By making a payment, you also agree to Razorpay\'s terms of service and privacy policy. Focalyst does not store your payment card details.',
      '5.3 Billing:\nFor monthly and yearly plans, your subscription renews automatically at the end of each billing period. You authorise us to charge your chosen payment method for renewal unless you cancel before the renewal date.',
      '5.4 Cancellation:\nYou may cancel your subscription at any time through Profile → Manage Plan. Cancellation takes effect at the end of your current billing period. You will retain Pro access until that date.',
      '5.5 Refund Policy:\nAll payments are non-refundable except where required by applicable Indian consumer protection law. If you experience a technical issue that prevents you from using a paid feature you subscribed for, contact us at contactfocalyst@gmail.com within 7 days and we will review your case.',
      '5.6 Price Changes:\nWe reserve the right to change subscription prices. We will notify existing subscribers at least 30 days before any price change takes effect. Your continued subscription after the notice period constitutes acceptance of the new price.',
      '5.7 Lifetime Plan:\nThe Lifetime plan grants access to all current features and future features added to Focalyst at no additional cost. "Future features" refers to features added to the standard Pro tier. Features that are separately priced or offered through a distinct product are not included.',
    ],
  },
  {
    title: '6. Free Plan Limitations',
    content: [
      'The free plan includes the following limits:\n• Maximum 2 active habits\n• Maximum 5 notes\n• Maximum 1 active countdown (target date within 30 days)\n• Pomodoro presets only (no custom durations)\n• Current week insights only\n• 5 AI chat messages per day',
      'When you reach a free plan limit, a prompt to upgrade will appear. You will never be forced to upgrade — you may continue using the app within free plan limits indefinitely.',
    ],
  },
  {
    title: '7. User Content',
    content: [
      '7.1 Ownership:\nYou retain full ownership of all content you create in Focalyst — including your tasks, notes, habits, and any other data you enter. We do not claim any ownership over your content.',
      '7.2 License to Us:\nBy using Focalyst, you grant us a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the service to you. This license ends when you delete the content or your account.',
      '7.3 Your Responsibility:\nYou are solely responsible for the content you create in Focalyst. You agree not to create content that is illegal, defamatory, obscene, or that infringes on the intellectual property rights of others.',
      '7.4 AI-Generated Content:\nContent suggested or generated by the Focalyst AI assistant is provided for informational and productivity purposes only. We make no guarantees about the accuracy, completeness, or fitness of AI-generated content. You are responsible for reviewing and verifying any AI suggestions before acting on them.',
    ],
  },
  {
    title: '8. Intellectual Property',
    content: [
      '8.1 Focalyst, its design, code, logo, branding, and all associated intellectual property are owned by Chintan and are protected by copyright and other applicable laws.',
      '8.2 The Focalyst name, logo, and tagline "Own your time." are trademarks of Focalyst. You may not use them without prior written permission.',
      '8.3 Nothing in these Terms transfers any intellectual property rights from us to you.',
    ],
  },
  {
    title: '9. Availability and Downtime',
    content: [
      '9.1 We aim to keep Focalyst available at all times but do not guarantee 100% uptime. We may take the service offline temporarily for maintenance, updates, or reasons beyond our control.',
      '9.2 We will endeavour to give advance notice of planned maintenance where possible.',
      '9.3 We are not liable for any loss or inconvenience caused by temporary unavailability of the service.',
    ],
  },
  {
    title: '10. Termination',
    content: [
      '10.1 By You:\nYou may delete your account at any time via Profile → Delete my account. This permanently deletes all your data. Subscription fees already paid are non-refundable.',
      '10.2 By Us:\nWe reserve the right to suspend or terminate your account without notice if you violate these Terms, engage in fraudulent activity, or use the service in a way that harms other users or our infrastructure.',
      '10.3 Effect of Termination:\nUpon termination, your right to use Focalyst ceases immediately. We will delete your personal data in accordance with our Privacy Policy, except where retention is required by law.',
    ],
  },
  {
    title: '11. Disclaimers',
    content: [
      '11.1 Focalyst is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.',
      '11.2 We do not warrant that the app will be error-free, uninterrupted, or free of viruses or other harmful components.',
      '11.3 The AI assistant is a productivity tool and not a substitute for professional advice. Do not rely on AI responses for medical, legal, financial, or emergency decisions.',
    ],
  },
  {
    title: '12. Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable Indian law, Focalyst and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app, including but not limited to loss of data, loss of revenue, or loss of productivity.',
      'Our total liability to you for any claim arising from your use of Focalyst shall not exceed the amount you paid us in the 3 months preceding the claim.',
    ],
  },
  {
    title: '13. Governing Law and Disputes',
    content: [
      'These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of Focalyst shall be subject to the exclusive jurisdiction of the courts in India.',
      'Before initiating any legal action, you agree to contact us at contactfocalyst@gmail.com and give us a reasonable opportunity (not less than 30 days) to resolve the dispute informally.',
    ],
  },
  {
    title: '14. Changes to These Terms',
    content: [
      'We may update these Terms from time to time. When we make material changes, we will notify you via a notice in the app and by updating the "Last Updated" date above. Your continued use of Focalyst after the updated Terms are posted constitutes your acceptance of the new Terms.',
      'If you do not agree to the updated Terms, you must stop using Focalyst and may delete your account.',
    ],
  },
  {
    title: '15. Contact',
    content: [
      'For questions about these Terms:\n• Email: contactfocalyst@gmail.com\n• Response time: Within 5 business days',
    ],
  },
];
