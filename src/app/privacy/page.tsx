import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/icons'


export default function PrivacyPage() {
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
                    PRIVACY POLICY
                </h1>
                <div className="w-8" />
            </header>

            <div className="max-w-2xl mx-auto px-5 pt-8 text-[14px] text-navy dark:text-slate-200">
                <h1 className="text-2xl font-bold text-navy dark:text-slate-100 mt-6 mb-4">Privacy Policy</h1>
                
                <p className="font-semibold text-navy dark:text-slate-100">Focalyst</p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-1"><strong>Effective Date:</strong> March 1, 2026</p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4"><strong>Last Updated:</strong> 25 May 2026</p>

                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    This Privacy Policy describes how Focalyst ("we", "our", or "us") collects, uses, stores, and protects your personal information when you use the Focalyst web application ("the App"). By using Focalyst, you agree to the practices described in this policy.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">1. Who We Are</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Focalyst is a productivity application built and operated by Chintan. For any privacy-related questions, contact us at <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a>.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">2. Information We Collect</h2>
                
                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">2.1 Information You Provide Directly</h3>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li><strong>Account information:</strong> Your name and email address, provided when you sign up via Google OAuth or email</li>
                    <li><strong>Profile information:</strong> Your profile type (Student, Freelancer, Creator, Working Professional, Entrepreneur) selected during onboarding</li>
                    <li><strong>Tasks:</strong> Titles, due dates, priorities, and completion status of tasks you create</li>
                    <li><strong>Habits:</strong> Habit names, frequency settings, reminder times, and daily completion logs</li>
                    <li><strong>Notes:</strong> Text content and titles of notes you write in the app</li>
                    <li><strong>Countdowns:</strong> Event names and target dates you enter</li>
                    <li><strong>AI chat messages:</strong> The messages you send to the Focalyst AI assistant</li>
                </ul>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">2.2 Information Collected Automatically</h3>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li><strong>Usage data:</strong> Which features you use, how frequently, and at what times — used to generate your Insights and Productivity Score</li>
                    <li><strong>Pomodoro session data:</strong> Duration, number of sets, and timestamps of focus sessions</li>
                    <li><strong>Device information:</strong> Browser type, operating system, and screen size — used for responsive design and bug fixing</li>
                    <li><strong>Log data:</strong> Server logs including IP address, request timestamps, and error reports — retained for 30 days for security monitoring</li>
                </ul>

                <h3 className="text-lg font-semibold text-navy dark:text-slate-200 mt-4 mb-2">2.3 Information We Do NOT Collect</h3>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>We do not collect your payment card details. All payment processing is handled entirely by Razorpay. We only receive a confirmation of payment status.</li>
                    <li>We do not collect your microphone audio. Speech-to-text processing happens entirely on your device using your browser's built-in Web Speech API. No audio is ever transmitted to our servers.</li>
                    <li>We do not collect your location data.</li>
                    <li>We do not sell your data to advertisers or third parties.</li>
                </ul>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">3. How We Use Your Information</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We use your information solely to:
                </p>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>Provide and operate the Focalyst app</li>
                    <li>Personalise your experience based on your profile type and usage patterns</li>
                    <li>Generate your weekly and monthly Insights and Productivity Score</li>
                    <li>Send you task and habit reminders if you have enabled notifications</li>
                    <li>Process subscription payments via Razorpay</li>
                    <li>Respond to your support requests</li>
                    <li>Detect and fix bugs and security vulnerabilities</li>
                    <li>Improve the app based on aggregated, anonymised usage patterns</li>
                </ul>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We do not use your personal data for advertising. We do not share your data with third parties for marketing purposes.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">4. AI and Gemini API</h2>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>A summary of your current tasks, habits, and focus data is sent to the Gemini API along with your message so the AI can give you relevant, personalised responses</li>
                    <li>This data is transmitted securely over HTTPS through our server — it is never sent directly from your browser to Google</li>
                    <li>We have configured the Gemini API with zero data retention settings where available, meaning your data is not used by Google to train AI models</li>
                    <li>AI chat logs are stored in our database for 30 days to allow conversation context, after which they are automatically deleted</li>
                    <li>We recommend you do not share sensitive personal information (passwords, financial details, government ID numbers) in the AI chat</li>
                </ul>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">5. Data Storage and Security</h2>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>Your data is stored securely using <strong>Supabase</strong> (PostgreSQL database hosted on AWS infrastructure)</li>
                    <li>All data is stored in a region within India or the EU, depending on our Supabase project configuration</li>
                    <li>We enforce <strong>Row Level Security (RLS)</strong> on all database tables — this means our database is configured at the technical level so that each user can only access their own data, even if a bug existed in our application code</li>
                    <li>All data is transmitted using <strong>HTTPS encryption</strong></li>
                    <li>Access to production systems is limited to authorised personnel only</li>
                    <li>We never store your passwords — authentication is handled by Supabase Auth using industry-standard protocols</li>
                </ul>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">6. Data Retention</h2>
                <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-card-bg/50 dark:border-slate-800">
                        <thead className="bg-card-bg/20 dark:bg-slate-900">
                            <tr>
                                <th className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-left font-semibold text-navy dark:text-slate-200">Data Type</th>
                                <th className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-left font-semibold text-navy dark:text-slate-200">Retention Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Account and profile data</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Until you delete your account</td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Tasks, habits, notes, countdowns</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Until you delete them or your account</td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Pomodoro and insight data</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Until you delete your account</td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">AI chat messages</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">30 days from message date</td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Server log data</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">30 days</td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Payment records</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">7 years (required by Indian accounting law)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">7. Your Rights</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    You have the following rights regarding your personal data:
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>Right to access:</strong> You may request a copy of all data we hold about you by emailing <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a>.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>Right to correction:</strong> You can edit your name and profile type directly in the app under Profile → Edit Profile.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>Right to deletion:</strong> You can permanently delete your account and all associated data by going to Profile → Delete my account. This is irreversible. Payment records required by law are retained for the mandatory period.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>Right to data portability:</strong> You may request an export of your data in JSON format by emailing <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a>. We will respond within 7 business days.
                </p>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    <strong>Right to withdraw consent:</strong> You may withdraw consent for non-essential data processing (such as AI personalisation) by contacting us. Note that withdrawing consent for core processing may limit app functionality.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">8. Cookies and Local Storage</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Focalyst uses browser local storage and cookies solely to:
                </p>
                <ul className="list-disc pl-5 mb-4 text-[14px] text-blue-muted dark:text-slate-400 space-y-1">
                    <li>Maintain your login session so you do not have to sign in on every visit</li>
                    <li>Store your UI preferences (such as selected filter chips) between sessions</li>
                </ul>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">9. Third-Party Services</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We use the following third-party services to operate Focalyst. Each has their own privacy policy:
                </p>
                
                <div className="overflow-x-auto my-6">
                    <table className="min-w-full border-collapse border border-card-bg/50 dark:border-slate-800">
                        <thead className="bg-card-bg/20 dark:bg-slate-900">
                            <tr>
                                <th className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-left font-semibold text-navy dark:text-slate-200">Service</th>
                                <th className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-left font-semibold text-navy dark:text-slate-200">Purpose</th>
                                <th className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-left font-semibold text-navy dark:text-slate-200">Privacy Policy</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-navy dark:text-slate-200 font-semibold">Supabase</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Database and authentication</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">
                                    <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">supabase.com/privacy</a>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-navy dark:text-slate-200 font-semibold">Google (Gemini API)</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">AI assistant</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">
                                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">policies.google.com/privacy</a>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-navy dark:text-slate-200 font-semibold">Razorpay</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">Payment processing</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">
                                    <a href="https://razorpay.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">razorpay.com/privacy</a>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-navy dark:text-slate-200 font-semibold">Vercel</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">App hosting</td>
                                <td className="border border-card-bg/50 dark:border-slate-800 px-4 py-2 text-blue-muted dark:text-slate-400">
                                    <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">vercel.com/legal/privacy-policy</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">10. Children's Privacy</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    Focalyst is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, please contact us at <a href="mailto:contactfocalyst@gmail.com" className="text-accent hover:underline">contactfocalyst@gmail.com</a> and we will delete it promptly.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">11. Changes to This Policy</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    We may update this Privacy Policy from time to time. When we make material changes, we will notify you by displaying a notice in the app and updating the "Last Updated" date at the top of this page. Your continued use of Focalyst after changes are posted constitutes your acceptance of the updated policy.
                </p>

                <hr className="border-card-bg/50 dark:border-slate-800 my-6" />

                <h2 className="text-xl font-semibold text-navy dark:text-slate-100 mt-6 mb-4 border-b border-card-bg/30 pb-2">12. Contact Us</h2>
                <p className="text-[14px] text-blue-muted dark:text-slate-400 mb-4 leading-relaxed">
                    For privacy-related questions, data requests, or concerns:
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
