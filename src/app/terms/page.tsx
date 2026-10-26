import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/desktop/public/LegalLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Focalyst, including plans, payments and refunds.',
  alternates: {
    canonical: 'https://focalyst.online/terms',
  },
  openGraph: {
    title: 'Terms of Service | Focalyst',
    description: 'The terms for using Focalyst, including plans, payments and refunds.',
    url: 'https://focalyst.online/terms',
  },
};

const TOC = [
  { id: 'agreement', label: '1. Agreement' },
  { id: 'eligibility', label: '2. Eligibility' },
  { id: 'your-account', label: '3. Your account' },
  { id: 'acceptable-use', label: '4. Acceptable use' },
  { id: 'your-content', label: '5. Your content' },
  { id: 'focalyst-ai', label: '6. Focalyst AI' },
  { id: 'plans-pricing-payment', label: '7. Plans, pricing and payment' },
  { id: 'refunds', label: '8. Refunds' },
  { id: 'free-plan-and-limits', label: '9. Free plan and limits' },
  { id: 'accountability-groups', label: '10. Accountability groups' },
  { id: 'mcp-and-third-party-tools', label: '11. MCP and third-party AI tools' },
  { id: 'third-party-services', label: '12. Third-party services' },
  { id: 'intellectual-property', label: '13. Our intellectual property' },
  { id: 'suspension-and-termination', label: '14. Suspension and termination' },
  { id: 'disclaimers', label: '15. Disclaimers' },
  { id: 'limitation-of-liability', label: '16. Limitation of liability' },
  { id: 'indemnity', label: '17. Indemnity' },
  { id: 'governing-law-and-disputes', label: '18. Governing law and disputes' },
  { id: 'changes-to-terms', label: '19. Changes to these Terms' },
  { id: 'contact', label: '20. Contact' },
];

const SHORT_VERSION = [
  'Focalyst is a productivity service run by Chintan, an MSME in Kolkata, India.',
  'You must be at least 13. If you are under 18, you need a parent\'s or guardian\'s consent.',
  'Your content belongs to you. We only use it to run Focalyst for you.',
  'Pro is billed through Polar. Cancel monthly or annual plans anytime.',
  'AI can be wrong. Use it as guidance, not professional advice.',
];

export default function TermsPage() {
  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Terms of Service', path: '/terms' },
  ]);

  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="20 October 2026"
      shortVersion={SHORT_VERSION}
      toc={TOC}
    >
      <JsonLd data={breadcrumbData} />
      <section id="agreement">
        <h2>1. Agreement</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and Chintan, an MSME registered in India and based in Kolkata, West Bengal, which operates Focalyst (&ldquo;Focalyst&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using focalyst.online, our apps or related services (the &ldquo;Service&rdquo;), you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Service.
        </p>
      </section>

      <section id="eligibility">
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use Focalyst. If you are under 18, you may use Focalyst only with the consent of a parent or legal guardian, who agrees to these Terms on your behalf.
        </p>
      </section>

      <section id="your-account">
        <h2>3. Your account</h2>
        <p>
          You are responsible for the information you provide, for keeping your sign-in details secure and for activity on your account. Tell us promptly at <a href="mailto:contactfocalyst@gmail.com">contactfocalyst@gmail.com</a> if you think your account has been accessed without permission.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break any law or infringe anyone&apos;s rights</li>
          <li>upload anything harmful, abusive, hateful or sexually explicit, or that harasses others, including in group names</li>
          <li>try to access accounts or data that are not yours</li>
          <li>interfere with, overload or reverse engineer the Service, or bypass plan limits</li>
          <li>use automated means to scrape the Service or abuse Focalyst AI</li>
          <li>resell or commercially exploit the Service without our written permission</li>
        </ul>
        <p>We may suspend or remove content or accounts that break these rules.</p>
      </section>

      <section id="your-content">
        <h2>5. Your content</h2>
        <p>
          You own everything you create in Focalyst, including your notes, tasks, habits and recordings. You give us a limited licence to store, process and display your content only to operate and improve the Service for you, including sending relevant content to our AI providers when you use AI features. This licence ends when you delete your content or your account.
        </p>
      </section>

      <section id="focalyst-ai">
        <h2>6. Focalyst AI</h2>
        <p>
          Focalyst AI, voice transcription, summaries and reports are generated by AI models and may be inaccurate or incomplete. They are for general productivity guidance only and are not professional, medical, legal, financial or psychological advice. You are responsible for how you use any AI output.
        </p>
      </section>

      <section id="plans-pricing-payment">
        <h2>7. Plans, pricing and payment</h2>
        <p>
          <strong>7.1 Plans.</strong> Focalyst offers a Free plan and paid Pro plans: Pro Monthly ($4.99 a month), Pro Annual ($39.99 a year) and Lifetime ($99.99 one-time). In India, prices are ₹99 a month, ₹999 a year and ₹2,999 for Lifetime. Prices shown at checkout, including any taxes, apply.
        </p>
        <p>
          <strong>7.2 Payments.</strong> Payments are processed by Polar, which may act as the seller of record and handle taxes and invoicing. Your purchase is also subject to Polar&apos;s terms.
        </p>
        <p>
          <strong>7.3 Renewals.</strong> Monthly and annual plans renew automatically at the end of each period until you cancel. You can cancel anytime, and you keep Pro until the end of the period you have paid for.
        </p>
        <p>
          <strong>7.4 Lifetime.</strong> Lifetime gives you access to Pro features for as long as Focalyst operates the Service. It is personal and cannot be transferred.
        </p>
        <p>
          <strong>7.5 Price changes.</strong> We may change prices for future periods. If the price of your subscription changes, we will tell you before it applies, and you can cancel before the new price takes effect.
        </p>
      </section>

      <section id="refunds">
        <h2>8. Refunds</h2>
        <p>
          If you are not satisfied, email <a href="mailto:contactfocalyst@gmail.com">contactfocalyst@gmail.com</a> from the address you used to pay:
        </p>
        <ul>
          <li>Pro Monthly and Pro Annual: within 7 days of your first payment for a full refund. Renewal payments are not refundable, but you can cancel to stop future renewals.</li>
          <li>Lifetime: within 14 days of purchase for a full refund.</li>
        </ul>
        <p>
          Refunds are processed through Polar to your original payment method. Where the law gives you additional rights, those rights still apply.
        </p>
      </section>

      <section id="free-plan-and-limits">
        <h2>9. Free plan and limits</h2>
        <p>
          The Free plan has limits, for example 5 Focalyst AI messages a day, the 25 minute focus preset and 1 countdown. We may change features and limits over time to keep Focalyst sustainable, and we will try to give notice of significant changes.
        </p>
      </section>

      <section id="accountability-groups">
        <h2>10. Accountability groups</h2>
        <p>
          Groups let members see each other&apos;s name, chosen habit and streak. Be respectful. Group creators and Focalyst may remove members who break these Terms.
        </p>
      </section>

      <section id="mcp-and-third-party-tools">
        <h2>11. MCP and third-party AI tools</h2>
        <p>
          When available, MCP is a Pro feature that lets you connect Focalyst to third-party AI assistants you choose. Your use of those assistants is governed by their own terms and privacy policies. You decide what to connect and can disconnect at any time.
        </p>
      </section>

      <section id="third-party-services">
        <h2>12. Third-party services</h2>
        <p>
          Focalyst relies on third-party providers such as Supabase, Vercel, OpenRouter, Polar, Kit, Google, Apple and Expo. We are not responsible for their services, but we choose them carefully.
        </p>
      </section>

      <section id="intellectual-property">
        <h2>13. Our intellectual property</h2>
        <p>
          Focalyst, its design, logo, software and content, other than your content, belong to Chintan and are protected by law. You may not copy, modify or distribute them without our written permission.
        </p>
      </section>

      <section id="suspension-and-termination">
        <h2>14. Suspension and termination</h2>
        <p>
          You can stop using Focalyst and delete your account at any time. We may suspend or end your access if you seriously or repeatedly break these Terms, if required by law, or to protect users or the Service. Where reasonable, we will give notice.
        </p>
      </section>

      <section id="disclaimers">
        <h2>15. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We work hard to keep Focalyst reliable, but we do not guarantee it will always be uninterrupted, error free or that data will never be lost. Focalyst is a productivity tool and does not guarantee any particular result.
        </p>
      </section>

      <section id="limitation-of-liability">
        <h2>16. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, Focalyst will not be liable for indirect, incidental or consequential losses, or for lost data, profits or opportunities. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section id="indemnity">
        <h2>17. Indemnity</h2>
        <p>
          You agree to compensate us for reasonable losses arising from your misuse of the Service or your breach of these Terms.
        </p>
      </section>

      <section id="governing-law-and-disputes">
        <h2>18. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of India. Before going to court, please contact us so we can try to resolve the issue. Any dispute will be subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal.
        </p>
      </section>

      <section id="changes-to-terms">
        <h2>19. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. If changes are significant, we will notify you in the app or by email. Continuing to use Focalyst after changes take effect means you accept the new Terms.
        </p>
      </section>

      <section id="contact">
        <h2>20. Contact</h2>
        <p>
          Focalyst by Chintan, Kolkata, West Bengal, India<br />
          Email: <a href="mailto:contactfocalyst@gmail.com">contactfocalyst@gmail.com</a>
        </p>
      </section>
    </LegalLayout>
  );
}
