'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    const [billing, setBilling] = useState<BillingCycle>('monthly')
    const router = useRouter()

    const handleSelectFree = () => {
        router.push('/onboarding/name')
    }

    const handleSelectPro = () => {
        // Razorpay stub — log to console
        console.log(`[Razorpay Stub] Selected Pro plan (${billing})`)
        router.push('/onboarding/name')
    }

    const handleSelectLifetime = () => {
        // Razorpay stub — log to console
        console.log('[Razorpay Stub] Selected Lifetime plan')
        router.push('/onboarding/name')
    }

    return (
        <main className="min-h-screen bg-white px-5 py-8">
            <div className="max-w-[400px] mx-auto">
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
                        Yearly
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
                            className="w-full h-11 bg-navy text-white text-[15px] font-semibold rounded-xl mt-3 transition-all active:scale-[0.98] hover:bg-navy-dark"
                        >
                            Get Pro plan
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
                            className="w-full h-11 rounded-xl border-[1.5px] border-navy text-navy text-[15px] font-semibold mt-3 transition-all active:scale-[0.98] hover:bg-navy/5"
                        >
                            Get Lifetime plan
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
