import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/desktop/public/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Focalyst by Chintan collects, uses and protects your personal data.',
};

const TOC = [
  { id: 'who-we-are', label: '1. Who we are' },
  { id: 'information-we-collect', label: '2. Information we collect' },
  { id: 'how-we-use-information', label: '3. How we use your information' },
  { id: 'how-focalyst-ai-works', label: '4. How Focalyst AI works' },
  { id: 'who-we-share-data-with', label: '5. Who we share data with' },
  { id: 'international-transfers', label: '6. International transfers' },
  { id: 'how-long-we-keep-data', label: '7. How long we keep data' },
  { id: 'security', label: '8. Security' },
  { id: 'your-rights', label: '9. Your rights' },
  { id: 'children', label: '10. Children' },
  { id: 'cookies-and-local-storage', label: '11. Cookies and local storage' },
  { id: 'changes-to-this-policy', label: '12. Changes to this policy' },
  { id: 'contact-and-grievance-officer', label: '13. Contact and grievance officer' },
];

const SHORT_VERSION = [
  'We collect only what Focalyst needs to work: your account, the things you create, and how you use the timer and AI.',
  'We never sell your data and we do not use advertising trackers. We use privacy-friendly, cookieless analytics from Vercel to count visits and measure how fast pages load.',
  'Focalyst AI uses your tasks, habits, notes and focus sessions as context to answer you. AI chats are deleted after 90 days.',
  'Voice notes and dictation are turned into text. The transcript is saved with your note.',
  'Delete your account and everything is permanently erased. We keep no backups of deleted accounts.',
];

const PROVIDERS = [
  {
    name: 'Supabase',
    purpose: 'Database, authentication and file storage',
    url: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel',
    purpose: 'Hosting, content delivery, security, and anonymous website analytics and performance measurement',
    url: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'OpenRouter',
    purpose: 'AI chat, summaries, reports and access to AI models',
    url: 'https://openrouter.ai/privacy',
  },
  {
    name: 'Polar',
    purpose: 'Payments, subscriptions and invoicing',
    url: 'https://polar.sh/legal/privacy',
  },
  {
    name: 'Kit',
    purpose: 'Waitlist and email updates you sign up for',
    url: 'https://kit.com/privacy',
  },
  {
    name: 'Google',
    purpose: 'Sign in with Google',
    url: 'https://policies.google.com/privacy',
  },
  {
    name: 'Apple',
    purpose: 'Sign in with Apple',
    url: 'https://www.apple.com/legal/privacy/',
  },
  {
    name: 'Expo',
    purpose: 'Delivering push notifications on our mobile app',
    url: 'https://expo.dev/privacy',
  },
];

const RETENTION = [
  {
    type: 'Account and content you create',
    period: 'Until you delete it or delete your account',
  },
  {
    type: 'AI chat conversations',
    period: '90 days, then permanently deleted',
  },
  {
    type: 'Voice note transcripts and summaries',
    period: 'Until you delete the note or your account',
  },
  {
    type: 'Waitlist and email updates',
    period: 'Until you unsubscribe or ask us to remove you',
  },
  {
    type: 'Payment records',
    period: 'Kept by Polar for as long as tax and accounting laws require',
  },
  {
    type: 'Technical logs',
    period: 'Kept by our hosting provider for a short period under its own policy',
  },
  {
    type: 'Website analytics and performance data',
    period: 'Anonymous and aggregated. Kept by Vercel under its own retention periods.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="26 October 2026"
      shortVersion={SHORT_VERSION}
      toc={TOC}
    >
      <section id="who-we-are">
        <h2>1. Who we are</h2>
        <p>
          Focalyst is a productivity service operated by Chintan, an MSME registered in India and based in Kolkata, West Bengal (&ldquo;Focalyst&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). Our founder and CEO is Sohan Tamang. This policy explains what personal data we collect when you use focalyst.online, the Focalyst apps and related services (together, the &ldquo;Service&rdquo;), why we collect it, who we share it with and the choices you have. For any question, write to <a href="mailto:contactfocalyst@gmail.com">contactfocalyst@gmail.com</a>.
        </p>
      </section>

      <section id="information-we-collect">
        <h2>2. Information we collect</h2>
        <p>
          <strong>2.1 Account information.</strong> Your name, email address, profile photo if you add one, sign-in method (Google, Apple or email and password), time zone and plan.
        </p>
        <p>
          <strong>2.2 Content you create.</strong> Habits and check-ins, tasks, reminders and calendar entries, countdowns, focus sessions, notes, checklists, folders, voice note transcripts and summaries, AI chat messages and the groups you create or join.
        </p>
        <p>
          <strong>2.3 Voice and dictation.</strong> When you record a voice note or dictate a message to Focalyst AI, your audio is sent for transcription to produce text. The transcript, and for voice notes the AI summary, is saved in your account.
        </p>
        <p>
          <strong>2.4 AI conversations.</strong> The messages you send to Focalyst AI and its replies.
        </p>
        <p>
          <strong>2.5 Payment information.</strong> When you buy Pro, payment is processed by Polar. We receive your plan, purchase status, amount, currency and transaction identifiers. We never receive or store your full card details.
        </p>
        <p>
          <strong>2.6 Notification settings.</strong> Your reminder preferences and, on our mobile app, a push notification token used to deliver reminders.
        </p>
        <p>
          <strong>2.7 Waitlist and email.</strong> If you join a waitlist or ask for updates, your email address and, if you share it, your first name.
        </p>
        <p>
          <strong>2.8 Technical information.</strong> Like any website, our hosting provider processes basic technical data such as your IP address, browser type and request logs to deliver the Service and keep it secure. On our website and web app we also use Vercel Web Analytics and Vercel Speed Insights. They record anonymous, aggregated information such as the page visited (with personal identifiers removed from the address), the referring website, your country or region, browser, operating system, device type and how quickly the page loaded. They do not use cookies, do not identify you and do not follow you across other websites. Vercel recognises a single visit using a temporary value derived from the request, which is discarded after 24 hours. These tools are not used inside our iOS and Android apps.
        </p>
        <p>
          <strong>2.9 Stored on your device.</strong> We store a few preferences on your device, such as your theme, sidebar state and sign-in session.
        </p>
      </section>

      <section id="how-we-use-information">
        <h2>3. How we use your information</h2>
        <ul>
          <li>To provide the Service: sync your data across devices, run timers, send reminders and show your Insights, levels and reports.</li>
          <li>To power AI features: answer your questions, summarise voice notes and generate weekly reports.</li>
          <li>To process payments and manage your plan.</li>
          <li>To run accountability groups and show leaderboards to group members.</li>
          <li>To communicate with you about your account, support requests and, if you asked for them, product updates.</li>
          <li>To keep the Service secure, prevent abuse and fix problems.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it for advertising.</p>
      </section>

      <section id="how-focalyst-ai-works">
        <h2>4. How Focalyst AI works</h2>
        <p>
          <strong>4.1 Context.</strong> To give answers that are about you, Focalyst AI uses the relevant parts of your tasks, habits, notes, focus sessions and goals as context. This data is sent securely to our AI provider, OpenRouter, which routes it to the language model that generates the reply.
        </p>
        <p>
          <strong>4.2 Speech to text.</strong> Voice notes and dictation are transcribed using the Whisper Large v3 Turbo speech recognition model, accessed through our AI service providers.
        </p>
        <p>
          <strong>4.3 Retention.</strong> AI chat conversations are stored for 90 days and then permanently deleted. Voice note transcripts and summaries stay with your note until you delete the note or your account.
        </p>
        <p>
          <strong>4.4 Accuracy.</strong> AI can make mistakes. Focalyst AI is not a substitute for professional, medical, legal or financial advice.
        </p>
      </section>

      <section id="who-we-share-data-with">
        <h2>5. Who we share data with</h2>
        <p>
          We share personal data only with service providers that help us run Focalyst, and only as needed for the purposes in this policy. Each provider handles data under its own privacy policy:
        </p>

        {/* Desktop / Tablet Table */}
        <div className="frost rounded-[16px] overflow-hidden hidden sm:block mt-6 border border-line">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">What they do for us</th>
                <th className="py-3 px-4">Privacy policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PROVIDERS.map((p) => (
                <tr key={p.name} className="hover:bg-surface-2/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-ink">{p.name}</td>
                  <td className="py-3 px-4 text-ink-2">{p.purpose}</td>
                  <td className="py-3 px-4">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-text underline hover:text-primary transition-colors text-[13px]"
                    >
                      {p.name} Privacy
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone Stacked Cards */}
        <div className="sm:hidden space-y-3 mt-6">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="frost rounded-[14px] p-4 space-y-1.5 border border-line">
              <div className="font-semibold text-ink text-[15px]">{p.name}</div>
              <div className="text-[13px] text-ink-2">{p.purpose}</div>
              <div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-text underline text-[13px]"
                >
                  View Privacy Policy
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4">
          We may also disclose data if the law requires it, to protect the rights and safety of our users or the public, or as part of a merger or sale of our business, in which case this policy will continue to protect your data.
        </p>

        <h3>5.1 Accountability groups</h3>
        <p>
          When you join a group, other members can see your name or initials, the habit you track in that group and your streak. They cannot see your notes, tasks, AI chats or any other data.
        </p>
      </section>

      <section id="international-transfers">
        <h2>6. International transfers</h2>
        <p>
          Our providers may store and process data on servers outside India, including in the United States and the European Union. When data leaves India, we rely on providers that apply strong security and contractual protections.
        </p>
      </section>

      <section id="how-long-we-keep-data">
        <h2>7. How long we keep data</h2>

        {/* Desktop / Tablet Table */}
        <div className="frost rounded-[16px] overflow-hidden hidden sm:block mt-6 border border-line">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">How long we keep it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {RETENTION.map((r) => (
                <tr key={r.type} className="hover:bg-surface-2/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-ink">{r.type}</td>
                  <td className="py-3 px-4 text-ink-2">{r.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone Stacked Cards */}
        <div className="sm:hidden space-y-3 mt-6">
          {RETENTION.map((r) => (
            <div key={r.type} className="frost rounded-[14px] p-4 space-y-1.5 border border-line">
              <div className="font-semibold text-ink text-[15px]">{r.type}</div>
              <div className="text-[13px] text-ink-2">{r.period}</div>
            </div>
          ))}
        </div>

        <p className="mt-4">
          When you delete your account, we permanently delete your account and all associated data from our systems. We do not keep backups of deleted accounts. Inactive accounts are not deleted automatically.
        </p>
      </section>

      <section id="security">
        <h2>8. Security</h2>
        <p>
          We protect your data with encryption in transit, secure authentication and access controls at the database level. No system is perfectly secure, so please use a strong password and keep your sign-in details private. If we become aware of a breach that affects you, we will notify you and the relevant authorities as the law requires.
        </p>
      </section>

      <section id="your-rights">
        <h2>9. Your rights</h2>
        <p>
          Depending on where you live, including under India&apos;s Digital Personal Data Protection Act, 2023 and, for users in the European Economic Area or the United Kingdom, the GDPR, you can:
        </p>
        <ul>
          <li>access the personal data we hold about you</li>
          <li>correct or update inaccurate data</li>
          <li>delete your data or your account</li>
          <li>receive a copy of your data</li>
          <li>withdraw consent where we rely on it</li>
          <li>nominate another person to exercise your rights if you are unable to</li>
          <li>raise a complaint with us, and if you are not satisfied, with your data protection authority</li>
        </ul>
        <p>
          To exercise any right, email <a href="mailto:contactfocalyst@gmail.com?subject=Privacy%20request">contactfocalyst@gmail.com</a> with the subject &ldquo;Privacy request&rdquo;. We will respond within 30 days.
        </p>
      </section>

      <section id="children">
        <h2>10. Children</h2>
        <p>
          Focalyst is not intended for children under 13, and they may not create an account. If you are between 13 and 18, you may use Focalyst only with the consent and supervision of a parent or legal guardian. If you believe a child has given us personal data without proper consent, contact us and we will delete it.
        </p>
      </section>

      <section id="cookies-and-local-storage">
        <h2>11. Cookies and local storage</h2>
        <p>
          We use only what is strictly necessary for Focalyst to work, such as keeping you signed in and remembering your preferences. We do not use advertising cookies, and our analytics are cookieless.
        </p>
      </section>

      <section id="changes-to-this-policy">
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy as Focalyst evolves. When we make significant changes, we will update the date above and, where appropriate, notify you in the app or by email.
        </p>
      </section>

      <section id="contact-and-grievance-officer">
        <h2>13. Contact and grievance officer</h2>
        <p>
          Focalyst by Chintan, Kolkata, West Bengal, India<br />
          Email: <a href="mailto:contactfocalyst@gmail.com">contactfocalyst@gmail.com</a><br />
          Grievance Officer: Sohan Tamang, Founder and CEO, <a href="mailto:contact.sohantamang@gmail.com">contact.sohantamang@gmail.com</a>
        </p>
        <p>We aim to respond to every request within 30 days.</p>
      </section>
    </LegalLayout>
  );
}
