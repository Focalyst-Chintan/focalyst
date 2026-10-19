import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/icons'

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-page-bg dark:bg-slate-950 pb-20 transition-colors duration-300">
            {/* Header */}
            <header 
                style={{ 
                    paddingTop: 'env(safe-area-inset-top)',
                    height: 'calc(56px + env(safe-area-inset-top))' 
                }}
                className="bg-white dark:bg-slate-900 border-b border-card-bg/50 dark:border-slate-800 flex items-center justify-between px-5 sticky top-0 z-30 transition-colors duration-300"
            >
                <Link href="/account" className="p-1 -ml-1 text-navy dark:text-slate-400 flex items-center gap-2">
                    <ArrowLeftIcon size={24} color="currentColor" />
                </Link>
                <h1 className="text-navy dark:text-slate-100 text-[16px] font-bold tracking-[0.15em] absolute left-1/2 -translate-x-1/2">
                    TERMS OF SERVICE
                </h1>
                <div className="w-8" />
            </header>

            <div className="max-w-2xl mx-auto px-5 pt-8 text-[14px] text-navy dark:text-slate-200">
                <h1 className="text-2xl font-bold text-navy dark:text-slate-100 mt-6 mb-4">Terms of Service</h1>
                
                <p className="font-semibold text-navy dark:text-slate-100">Focalyst</p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-1"><strong>Effective Date:</strong> March 1, 2026</p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4"><strong>Last Updated:</strong> March 1, 2026</p>

                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Please read these Terms of Service carefully before using Focalyst. By creating an account or using the app, you agree to be bound by these terms.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">1. Acceptance of Terms</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    These Terms of Service ("Terms") form a legally binding agreement between you ("User", "you") and Focalyst ("we", "our", "us"), operated by Chintan. By accessing or using the Focalyst web application at any domain or subdomain associated with Focalyst, you agree to these Terms in full.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    If you do not agree to these Terms, you must not use Focalyst.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">2. Description of Service</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Focalyst is a productivity web application offering task management, habit tracking, Pomodoro focus timers, day countdowns, rich text notes, usage insights, and an AI-powered chat assistant. The service is available on a free tier and paid subscription tiers as described on our pricing page.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">3. Account Registration</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.1</strong> You must create an account to use Focalyst. You may sign up using Google OAuth or a valid email address.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.2</strong> You must be at least 13 years of age to create an account.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.3</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.4</strong> You agree to provide accurate, complete, and current information during registration and to keep your account information updated.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.5</strong> You must notify us immediately at <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a> if you suspect unauthorised access to your account.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>3.6</strong> We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">4. Acceptable Use</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    You agree to use Focalyst only for lawful, personal productivity purposes. You must not:
                </p>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>Use the app to store, transmit, or process any illegal content</li>
                    <li>Attempt to reverse engineer, decompile, or extract the source code of the application</li>
                    <li>Use automated scripts, bots, or scraping tools to access or extract data from the app</li>
                    <li>Attempt to circumvent, disable, or interfere with any security features including Row Level Security policies</li>
                    <li>Use the AI assistant to generate harmful, illegal, abusive, or misleading content</li>
                    <li>Share your account credentials with others or allow multiple people to use a single account</li>
                    <li>Resell, sublicense, or commercially exploit the Focalyst service without written permission</li>
                    <li>Upload or transmit malware, viruses, or any malicious code through the app</li>
                    <li>Use the app in any way that could damage, overload, or impair our servers or infrastructure</li>
                </ul>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">5. Subscription Plans and Payments</h2>
                
                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.1 Plans</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-2">
                    Focalyst offers the following plans:
                </p>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li><strong>Free:</strong> ₹0, with feature limitations as described on the pricing page</li>
                    <li><strong>Pro Monthly:</strong> ₹99 per month, billed monthly</li>
                    <li><strong>Pro Yearly:</strong> ₹999 per year, billed annually</li>
                    <li><strong>Lifetime:</strong> ₹2,999 one-time payment</li>
                </ul>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4">
                    Feature entitlements for each plan are detailed in the app and on the pricing page. We reserve the right to modify plan features with reasonable notice.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.2 Payment Processing</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    All payments are processed by Razorpay. By making a payment, you also agree to Razorpay's terms of service and privacy policy. Focalyst does not store your payment card details.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.3 Billing</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    For monthly and yearly plans, your subscription renews automatically at the end of each billing period. You authorise us to charge your chosen payment method for renewal unless you cancel before the renewal date.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.4 Cancellation</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    You may cancel your subscription at any time through Profile → Manage Plan. Cancellation takes effect at the end of your current billing period. You will retain Pro access until that date.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.5 Refund Policy</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    All payments are non-refundable except where required by applicable Indian consumer protection law. If you experience a technical issue that prevents you from using a paid feature you subscribed for, contact us at <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a> within 7 days and we will review your case.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.6 Price Changes</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We reserve the right to change subscription prices. We will notify existing subscribers at least 30 days before any price change takes effect. Your continued subscription after the notice period constitutes acceptance of the new price.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">5.7 Lifetime Plan</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    The Lifetime plan grants access to all current features and future features added to Focalyst at no additional cost. "Future features" refers to features added to the standard Pro tier. Features that are separately priced or offered through a distinct product are not included.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">6. Free Plan Limitations</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-2">
                    The free plan includes the following limits:
                </p>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>Maximum 2 active habits</li>
                    <li>Maximum 5 notes</li>
                    <li>Maximum 1 active countdown (target date within 30 days)</li>
                    <li>Pomodoro presets only (no custom durations)</li>
                    <li>Current week insights only</li>
                    <li>5 AI chat messages per day</li>
                </ul>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    When you reach a free plan limit, a prompt to upgrade will appear. You will never be forced to upgrade — you may continue using the app within free plan limits indefinitely.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">7. User Content</h2>
                
                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">7.1 Ownership</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    You retain full ownership of all content you create in Focalyst — including your tasks, notes, habits, and any other data you enter. We do not claim any ownership over your content.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">7.2 License to Us</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    By using Focalyst, you grant us a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the service to you. This license ends when you delete the content or your account.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">7.3 Your Responsibility</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    You are solely responsible for the content you create in Focalyst. You agree not to create content that is illegal, defamatory, obscene, or that infringes on the intellectual property rights of others.
                </p>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">7.4 AI-Generated Content</h3>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Content suggested or generated by the Focalyst AI assistant is provided for informational and productivity purposes only. We make no guarantees about the accuracy, completeness, or fitness of AI-generated content. You are responsible for reviewing and verifying any AI suggestions before acting on them.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">8. Intellectual Property</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>8.1</strong> Focalyst, its design, code, logo, branding, and all associated intellectual property are owned by Chintan and are protected by copyright and other applicable laws.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>8.2</strong> The Focalyst name, logo, and tagline "Own your time." are trademarks of Focalyst. You may not use them without prior written permission.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>8.3</strong> Nothing in these Terms transfers any intellectual property rights from us to you.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">9. Availability and Downtime</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>9.1</strong> We aim to keep Focalyst available at all times but do not guarantee 100% uptime. We may take the service offline temporarily for maintenance, updates, or reasons beyond our control.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>9.2</strong> We will endeavour to give advance notice of planned maintenance where possible.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>9.3</strong> We are not liable for any loss or inconvenience caused by temporary unavailability of the service.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">10. Termination</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>10.1 By You</strong><br />
                    You may delete your account at any time via Profile → Delete my account. This permanently deletes all your data. Subscription fees already paid are non-refundable.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>10.2 By Us</strong><br />
                    We reserve the right to suspend or terminate your account without notice if you violate these Terms, engage in fraudulent activity, or use the service in a way that harms other users or our infrastructure.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>10.3 Effect of Termination</strong><br />
                    Upon termination, your right to use Focalyst ceases immediately. We will delete your personal data in accordance with our Privacy Policy, except where retention is required by law.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">11. Disclaimers</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>11.1</strong> Focalyst is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>11.2</strong> We do not warrant that the app will be error-free, uninterrupted, or free of viruses or other harmful components.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>11.3</strong> The AI assistant is a productivity tool and not a substitute for professional advice. Do not rely on AI responses for medical, legal, financial, or emergency decisions.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">12. Limitation of Liability</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    To the maximum extent permitted by applicable Indian law, Focalyst and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app, including but not limited to loss of data, loss of revenue, or loss of productivity.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Our total liability to you for any claim arising from your use of Focalyst shall not exceed the amount you paid us in the 3 months preceding the claim.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">13. Governing Law and Disputes</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of Focalyst shall be subject to the exclusive jurisdiction of the courts in India.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Before initiating any legal action, you agree to contact us at <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a> and give us a reasonable opportunity (not less than 30 days) to resolve the dispute informally.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">14. Changes to These Terms</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We may update these Terms from time to time. When we make material changes, we will notify you via a notice in the app and by updating the "Last Updated" date above. Your continued use of Focalyst after the updated Terms are posted constitutes your acceptance of the new Terms.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    If you do not agree to the updated Terms, you must stop using Focalyst and may delete your account.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">15. Contact</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-2">
                    For questions about these Terms:
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-1">
                    <strong>Email:</strong> <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a>
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4">
                    <strong>Response time:</strong> Within 5 business days
                </p>
            </div>
        </main>
    )
}
