'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { joinWaitlist } from '@/actions/waitlist'

type BillingCycle = 'monthly' | 'yearly'

const FREE_FEATURES = [
    'Unlimited to-do tasks',
    'Up to 2 habits',
    '4 built-in Pomodoro presets',
    '1 countdown (30 days max)',
    'Up to 5 notes',
    '5 AI chat messages per day',
]

const PRO_FEATURES = [
    'Everything in Free',
    'Unlimited habits',
    'Custom Pomodoro timer',
    'Unlimited countdowns',
    'Unlimited notes',
    'Unlimited AI chat',
    'AI Productivity Score',
    'Weekly + Monthly insights',
    'Priority support',
]

const LIFETIME_FEATURES = [
    'Everything in Pro',
    'Pay once, focus forever',
    'All future features included',
    'Premium support',
]

export default function PlansPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse bg-card-bg w-12 h-12 rounded-full" />
            </div>
        }>
            <PlansContent />
        </Suspense>
    )
}

function PlansContent() {
    const [billing, setBilling] = useState<BillingCycle>('monthly')
    const [isProcessing, setIsProcessing] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect')
    const supabase = createClient()

    const showToast = (message: string) => {
        setToast(message)
        setTimeout(() => setToast(null), 4000)
    }

    const handleSelectFree = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('users').update({
                plan: 'free',
                updated_at: new Date().toISOString()
            }).eq('id', user.id)
        }

        if (redirect) {
            router.push(redirect)
        } else {
            router.push('/onboarding/name')
        }
    }

    const handleSelectPro = async () => {
        setIsProcessing(true)
        try {
            await joinWaitlist('pro')
            showToast('Thanks for your interest! Pro features are coming in our next update.')
        } catch {
            showToast('Something went wrong. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSelectLifetime = async () => {
        setIsProcessing(true)
        try {
            await joinWaitlist('lifetime')
            showToast('Thanks for your interest! Pro features are coming in our next update.')
        } catch {
            showToast('Something went wrong. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <main className="min-h-screen bg-white px-5 py-8">
            <div className="max-w-[400px] mx-auto">
                {/* Toast Notification */}
                {toast && (
                    <div
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-[340px] w-full bg-navy text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-lg animate-[fadeInDown_0.3s_ease-out]"
                        style={{ animationFillMode: 'forwards' }}
                    >
                        {toast}
                    </div>
                )}

                {/* Back button for users arriving from profile */}
                {redirect && (
                    <button
                        onClick={() => router.push(redirect)}
                        className="flex items-center gap-1 text-navy text-[14px] font-medium mb-4 hover:opacity-70 transition-opacity"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                )}

                {/* Headline */}
                <h1 className="text-navy text-[28px] font-bold leading-9 mb-6">
                    Plans to catalyse your focus
                </h1>

                {/* Monthly / Yearly Toggle */}
                <div className="flex gap-1 bg-card-bg rounded-full p-1 mb-6">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`flex-1 h-10 rounded-full text-[13px] font-semibold transition-all ${billing === 'monthly'
                            ? 'bg-navy text-white'
                            : 'text-navy hover:bg-card-border/30'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`flex-1 h-10 rounded-full text-[13px] font-semibold transition-all ${billing === 'yearly'
                            ? 'bg-navy text-white'
                            : 'text-navy hover:bg-card-border/30'
                            }`}
                    >
                        Yearly (2 months free)
                    </button>
                </div>

                {/* Plan Cards */}
                <div className="flex flex-col gap-3">
                    {/* FREE Card */}
                    <div className="bg-card-bg rounded-xl p-4">
                        <h2 className="text-navy text-lg font-bold">FREE</h2>
                        <p className="text-blue-muted text-[13px] mt-0.5">
                            Start your focus journey
                        </p>
                        <p className="text-navy text-[28px] font-bold mt-2">
                            INR 0
                        </p>
                        <button
                            onClick={handleSelectFree}
                            className="w-full h-11 bg-navy text-white text-[15px] font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-navy-dark"
                        >
                            Use for Free
                        </button>
                        <ul className="mt-3 space-y-1.5">
                            {FREE_FEATURES.map((f) => (
                                <li key={f} className="text-navy-darker text-[12px] flex items-start gap-2">
                                    <span className="text-navy mt-0.5 shrink-0">&#x2022;</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* PRO Card */}
                    <div className="bg-card-bg rounded-xl p-4 relative">
                        <div className="flex items-center gap-2">
                            <h2 className="text-navy text-lg font-bold">PRO</h2>
                            <span className="bg-accent text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                                Most Popular
                            </span>
                            {billing === 'yearly' && (
                                <span className="bg-accent text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                                    Save 16%
                                </span>
                            )}
                        </div>
                        <p className="text-blue-muted text-[13px] mt-0.5">
                            Unlock your full potential
                        </p>
                        <p className="text-navy text-[28px] font-bold mt-2">
                            INR {billing === 'monthly' ? '99' : '999'}
                            <span className="text-blue-muted text-sm font-normal">
                                /{billing === 'monthly' ? 'month' : 'year'}
                            </span>
                        </p>
                        <button
                            onClick={handleSelectPro}
                            disabled={isProcessing}
                            className="w-full h-11 bg-navy text-white text-[15px] font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-navy-dark disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : 'Get Pro plan'}
                        </button>
                        <ul className="mt-3 space-y-1.5">
                            {PRO_FEATURES.map((f) => (
                                <li key={f} className="text-navy-darker text-[12px] flex items-start gap-2">
                                    <span className="text-navy mt-0.5 shrink-0">&#x2022;</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* LIFETIME Card */}
                    <div className="bg-card-bg rounded-xl p-4">
                        <h2 className="text-navy text-lg font-bold">LIFETIME</h2>
                        <p className="text-blue-muted text-[13px] mt-0.5">
                            Best Value. Pay once. Focus forever.
                        </p>
                        <p className="text-navy text-[28px] font-bold mt-2">
                            INR 2999
                            <span className="text-blue-muted text-sm font-normal"> billed once</span>
                        </p>
                        <button
                            onClick={handleSelectLifetime}
                            disabled={isProcessing}
                            className="w-full h-11 rounded-xl border-[1.5px] border-navy text-navy text-[15px] font-semibold mt-3 transition-all active:scale-[0.98] hover:bg-navy/5 disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : 'Get Lifetime plan'}
                        </button>
                        <ul className="mt-3 space-y-1.5">
                            {LIFETIME_FEATURES.map((f) => (
                                <li key={f} className="text-navy-darker text-[12px] flex items-start gap-2">
                                    <span className="text-navy mt-0.5 shrink-0">&#x2022;</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    )
}
