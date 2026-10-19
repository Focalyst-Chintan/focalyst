import Link from 'next/link';
import { Trash2, Mail, ShieldAlert, ArrowLeft, Clock, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

export const metadata = {
    title: "Delete Your Focalyst Account | Focalyst",
    description: "Request the permanent deletion of your Focalyst account and all associated personal data from Focalyst.",
};

export default function DeleteAccountPage() {
    const deletedDataTypes = [
        { name: "Tasks", desc: "All your created tasks, due dates, priorities, and history." },
        { name: "Habits", desc: "All habit names, frequencies, reminder schedules, and completion logs." },
        { name: "Notes", desc: "All text notes, titles, formatting, and drafts written in the app." },
        { name: "Focus Sessions", desc: "All Pomodoro logs, history, durations, sets, and analytics." },
        { name: "Countdowns", desc: "All event countdown names, target dates, and settings." },
        { name: "Reports & Insights", desc: "All weekly/monthly reports, productivity scores, and stats." },
    ];

    return (
        <main className="min-h-screen bg-page-bg dark:bg-[#020617] pb-20 transition-colors duration-300">
            {/* Header */}
            <header 
                style={{ 
                    paddingTop: 'env(safe-area-inset-top)',
                    height: 'calc(56px + env(safe-area-inset-top))' 
                }}
                className="bg-white dark:bg-slate-900 border-b border-card-bg/50 dark:border-slate-800 flex items-center justify-between px-5 sticky top-0 z-30 transition-colors duration-300"
            >
                <Link href="/" className="p-1 -ml-1 text-navy dark:text-slate-400 hover:text-navy-dark dark:hover:text-slate-200 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-navy dark:text-slate-100 text-[16px] font-bold tracking-[0.15em] absolute left-1/2 -translate-x-1/2">
                    FOCALYST
                </h1>
                <div className="w-8" />
            </header>

            <div className="max-w-2xl mx-auto px-5 pt-8">
                {/* Intro Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-card-bg/30 dark:border-slate-800/80 p-6 md:p-8 shadow-sm transition-colors duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-red-500 dark:text-red-400">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                                Delete Your Focalyst Account
                            </h1>
                            <p className="text-sm text-blue-muted dark:text-slate-400 mt-1">
                                Permanent account and data deletion request
                            </p>
                        </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-[14px] leading-relaxed mb-6">
                        At Focalyst, we value your privacy and trust. In compliance with Google Play's Data Safety policies, we provide a straightforward way for you to permanently delete your account and all associated personal data. 
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 flex gap-3 mb-8">
                        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                                This action is permanent and irreversible
                            </h4>
                            <p className="text-xs text-amber-700/95 dark:text-amber-400/80 mt-1 leading-relaxed">
                                Once deleted, your account and all associated data cannot be recovered. You will immediately lose access to all premium features and custom data.
                            </p>
                        </div>
                    </div>

                    {/* Data Deletion List */}
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                            What data will be deleted?
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                            When your account is deleted, the following information is permanently purged from our secure servers:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {deletedDataTypes.map((item, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-blue-muted dark:text-slate-400 mt-0.5">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How to request deletion */}
                    <div className="border-t border-card-bg/30 dark:border-slate-800/80 pt-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-accent" />
                            How to request deletion
                        </h2>
                        
                        <div className="bg-page-bg dark:bg-slate-950 border border-card-bg/40 dark:border-slate-800 rounded-xl p-5 mb-4">
                            <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 dark:bg-accent/20 text-accent font-bold text-xs shrink-0">
                                        1
                                    </span>
                                    <span>
                                        Compose an email from the <strong>same email address</strong> you used to sign up for Focalyst.
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 dark:bg-accent/20 text-accent font-bold text-xs shrink-0">
                                        2
                                    </span>
                                    <span>
                                        Send the request to our support email:
                                        <a 
                                            href="mailto:contactfocalyst@gmail.com?subject=Focalyst%20Account%20Deletion%20Request" 
                                            className="block mt-2 text-base font-semibold text-accent hover:underline flex items-center gap-1.5"
                                        >
                                            <Mail className="w-4 h-4" />
                                            contactfocalyst@gmail.com
                                        </a>
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 dark:bg-accent/20 text-accent font-bold text-xs shrink-0">
                                        3
                                    </span>
                                    <span>
                                        Use the subject line <strong>"Focalyst Account Deletion Request"</strong> and state that you wish to delete your account and associated data.
                                    </span>
                                </li>
                            </ol>
                        </div>

                        {/* Processing Note */}
                        <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Clock className="w-5 h-5 text-blue-muted dark:text-slate-400 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                <strong>Processing Time:</strong> Deletion requests are processed within <strong>7 days</strong>. You will receive a confirmation email once the deletion is complete.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer links */}
                <div className="mt-8 text-center text-xs text-blue-muted dark:text-slate-500">
                    <p>© {new Date().getFullYear()} Focalyst. All rights reserved.</p>
                    <div className="flex justify-center gap-4 mt-2">
                        <Link href="/privacy" className="hover:text-accent transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="hover:text-accent transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
