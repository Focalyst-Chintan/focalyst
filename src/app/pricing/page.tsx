import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import PricingSection from '@/components/PricingSection';
import FaqAccordion from '@/components/desktop/public/FaqAccordion';
import { JsonLd } from '@/components/seo/JsonLd';
import { SOFTWARE_APP, breadcrumb } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Focalyst is free to start. Pro is $4.99 a month, $39.99 a year or $99.99 for Lifetime. In India: ₹99, ₹999 or ₹2,999.',
  alternates: {
    canonical: 'https://focalyst.online/pricing',
  },
  openGraph: {
    title: 'Pricing | Focalyst',
    description:
      'Focalyst is free to start. Pro is $4.99 a month, $39.99 a year or $99.99 for Lifetime. In India: ₹99, ₹999 or ₹2,999.',
    url: 'https://focalyst.online/pricing',
  },
};

const PRICING_FAQ = [
  {
    id: 'cancel-anytime',
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancel your monthly or yearly plan in Settings > Focalyst Pro > Manage plan. You keep Pro until the end of the period you paid for.',
  },
  {
    id: 'currency',
    question: 'Which currency will I pay in?',
    answer:
      'In India you pay in rupees. Everywhere else you pay in US dollars. The final price and any taxes are shown at checkout.',
  },
  {
    id: 'phone-support',
    question: 'Does Pro work on my phone too?',
    answer:
      'Yes. Pro is linked to your Focalyst account, so it works on the web and in the iOS and Android apps when you sign in with the same account.',
  },
  {
    id: 'after-payment',
    question: 'What happens after I pay?',
    answer:
      'Pro turns on for your account right away, and Polar, our payment partner, emails you a receipt.',
  },
  {
    id: 'refund-policy',
    question: 'Can I get a refund?',
    answer:
      'Yes, within the refund window in our [Terms of Service](/terms#refunds). Email contactfocalyst@gmail.com from the address you paid with.',
  },
];

export default function PricingPage() {
  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ]);

  return (
    <PublicLayout>
      <JsonLd data={[SOFTWARE_APP, breadcrumbData]} />
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pt-16 sm:pt-20 pb-24 font-ui">
        {/* Header Block */}
        <div className="mx-auto max-w-[760px] text-center mb-8 sm:mb-12">
          <span className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
            PRICING
          </span>
          <h1 className="mt-4 font-display text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-0.015em] text-ink">
            Start free. Go Pro when you are ready.
          </h1>
          <p className="mt-3.5 text-[15px] sm:text-[17px] leading-[1.55] text-ink-2 max-w-[620px] mx-auto">
            One Focalyst account across web, iOS and Android. Pro unlocks more AI, custom focus timers and your weekly Catalyst Report.
          </p>
        </div>

        {/* Pricing Cards Section */}
        <PricingSection mode="pricing" />

        {/* Plain server-rendered line under the cards */}
        <p className="text-center text-[13.5px] text-ink-3 mt-4 max-w-[720px] mx-auto leading-relaxed">
          Pro: $4.99 a month or $39.99 a year. Lifetime: $99.99 one-time. In India: ₹99 a month, ₹999 a year or ₹2,999 Lifetime. Final price and any taxes are shown at checkout.
        </p>

        {/* FAQ Section */}
        <div className="mt-20 sm:mt-28 mx-auto max-w-[800px]">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-[28px] sm:text-[36px] leading-[1.1] text-ink">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-[14px] sm:text-[15px] text-ink-2">
              Everything you need to know about Focalyst plans and billing.
            </p>
          </div>
          <FaqAccordion items={PRICING_FAQ} />
        </div>
      </div>
    </PublicLayout>
  );
}
