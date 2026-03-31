'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase'

type BillingCycle = 'monthly' | 'yearly'
type Region = 'IN' | 'INT'

const PRICING = {
    IN: {
        symbol: 'INR',
        monthly: 99,
        yearly: 999,
        lifetime: 2999,
        monthlyLabel: '99',
        yearlyLabel: '999',
        yearlyMonthlyEquiv: '83',
        lifetimeLabel: '2,999',
    },
    INT: {
        symbol: '$',
        monthly: 4.99,
        yearly: 39.99,
        lifetime: 99.00,
        monthlyLabel: '4.99',
        yearlyLabel: '39.99',
        yearlyMonthlyEquiv: '3.33',
        lifetimeLabel: '99.00',
        ids: {
            monthly: 'b3930493-c480-48b4-a9ba-429253d84deb',
            yearly: '2a6f2130-f866-4b84-968e-3a097b20607c',
            lifetime: '5c2d430b-908b-4b15-a2d6-01b655d73cfb',
        }
    },
}

const PRO_FEATURES = [
    'Unlimited habit tracking',
    'Custom pomodoro timer',
    'Unlimited day countdown',
    'Unlimited AI chat',
    'AI productivity score',
    'Weekly + monthly insights',
    'Unlimited notes',
    'Priority support',
]

const LIFETIME_FEATURES = [
    'All Future Feature Updates',
    'Priority Support Channel',
]

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? match[2] : null
}

export default function PaywallPage() {
    const router = useRouter()
    const [billing, setBilling] = useState<BillingCycle>('yearly')
    const [region, setRegion] = useState<Region>('INT')
    const [isLoading, setIsLoading] = useState(false)
    const [isRestoring, setIsRestoring] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly')

    useEffect(() => {
        const r = getCookie('user-region')
        if (r === 'IN' || r === 'INT') setRegion(r)
    }, [])

    // Update selected plan when billing toggle changes
    useEffect(() => {
        if (selectedPlan !== 'lifetime') {
            setSelectedPlan(billing)
        }
    }, [billing, selectedPlan])

    const price = PRICING[region]

    const handleCheckout = async (planType: 'monthly' | 'yearly' | 'lifetime') => {
        setIsLoading(true)

        // ─── International (Polar) → Direct Redirect ────────────────
        if (region === 'INT') {
            const productId = PRICING.INT.ids[planType as keyof typeof PRICING.INT.ids]
            console.log("Redirecting to Polar:", productId)
            window.location.href = `/api/checkout/polar?productId=${productId}`
            return
        }

        try {
            const res = await fetch('/api/checkout/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType, region }),
            })

            const data = await res.json()

            if (!res.ok) {
                const errMsg = data.error || data.details || 'Unable to start checkout. Please try again.'
                console.error('Checkout creation failed:', errMsg)
                alert(errMsg)
                setIsLoading(false)
                return
            }

            if (data.provider === 'razorpay') {
                openRazorpayCheckout(data)
            }
        } catch (error: any) {
            console.error('Checkout failed:', error)
            alert(`Payment system error: ${error.message}`)
            setIsLoading(false)
        }
    }

    const restoreSubscription = async () => {
        setIsRestoring(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert('Please log in to restore your purchase.')
                return
            }

            const { data: sub, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active'])
                .single()

            if (sub && !error) {
                router.push('/dashboard?payment=success')
            } else {
                alert('No active subscription found.')
            }
        } catch (error) {
            console.error('Restore failed:', error)
            alert('Failed to restore subscription.')
        } finally {
            setIsRestoring(false)
        }
    }

    const openRazorpayCheckout = (data: {
        type: string
        orderId?: string
        subscriptionId?: string
        amount?: number
        keyId: string
    }) => {
        if (typeof window === 'undefined' || !(window as any).Razorpay) {
            console.error('Razorpay SDK not loaded')
            setIsLoading(false)
            return
        }

        const options: Record<string, unknown> = {
            key: data.keyId,
            name: 'Focalyst',
            description: data.type === 'order' ? 'Lifetime Access' : 'Pro Subscription',
            handler: () => {
                // Payment success – redirect
                router.push('/dashboard?payment=success')
            },
            modal: {
                ondismiss: () => {
                    setIsLoading(false)
                },
            },
            theme: { color: '#1D70F5' },
        }

        if (data.type === 'order') {
            options.order_id = data.orderId
            options.amount = data.amount
            options.currency = 'INR'
        } else {
            options.subscription_id = data.subscriptionId
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
    }

    return (
        <main className="min-h-screen bg-white relative pb-[220px]">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="max-w-[420px] mx-auto px-5 pt-5">
                {/* ─── Top Bar ──────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[22px] font-extrabold text-[#0f172a] tracking-tight">
                        Focalyst
                    </span>
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ─── Hero Text ────────────────────────────── */}
                <div className="mb-6">
                    <h1 className="text-[32px] font-extrabold leading-[1.15] text-[#0f172a]">
                        Unlock your full<br />
                        <span className="text-[#1D70F5]">productivity.</span>
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
                        Join 10,000+ high-achievers using Focalyst to reclaim 2 hours of their day.
                    </p>
                </div>

                {/* ─── Billing Toggle ──────────────────────── */}
                <div className="flex items-center justify-center mb-7">
                    <div className="flex items-center bg-[#f1f5f9] rounded-full p-1 gap-0.5">
                        <button
                            onClick={() => setBilling('monthly')}
                            className={`px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all duration-200 ${billing === 'monthly'
                                ? 'bg-white text-[#0f172a] shadow-sm'
                                : 'text-gray-500'
                                }`}
                        >
                            MONTHLY
                        </button>
                        <button
                            onClick={() => setBilling('yearly')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all duration-200 ${billing === 'yearly'
                                ? 'bg-white text-[#0f172a] shadow-sm'
                                : 'text-gray-500'
                                }`}
                        >
                            YEARLY
                            <span className="bg-[#1D70F5] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">
                                2 MONTHS FREE
                            </span>
                        </button>
                    </div>
                </div>

                {/* ─── Pro Card ────────────────────────────── */}
                <div
                    className={`relative bg-[#eff6ff] rounded-2xl p-5 mb-4 cursor-pointer transition-all duration-200 ${selectedPlan !== 'lifetime' ? 'ring-2 ring-[#1D70F5]' : ''
                        }`}
                    onClick={() => setSelectedPlan(billing)}
                >
                    {/* PRO Badge */}
                    <div className="absolute -top-2 right-4">
                        <span className="bg-[#0f172a] text-white text-[11px] font-bold px-3 py-1 rounded-md tracking-wide">
                            PRO
                        </span>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-[20px] font-extrabold text-[#0f172a]">
                            {billing === 'yearly' ? 'Pro Annual' : 'Pro Monthly'}
                        </h2>
                        <p className="text-[13px] text-[#1D70F5] font-medium mt-0.5">
                            Everything in basic, plus elite tools.
                        </p>
                    </div>

                    <div className="mb-5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[32px] font-extrabold text-[#0f172a]">
                                {price.symbol} {billing === 'yearly' ? price.yearlyMonthlyEquiv : price.monthlyLabel}
                            </span>
                            <span className="text-[15px] text-gray-400 font-medium">
                                / month
                            </span>
                        </div>
                        {billing === 'yearly' && (
                            <p className="text-[13px] text-gray-400 mt-1">
                                Billed annually at {price.symbol} {price.yearlyLabel}
                            </p>
                        )}
                    </div>

                    <ul className="space-y-3">
                        {PRO_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-[#1D70F5] flex items-center justify-center flex-shrink-0">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <span className="text-[14px] text-[#1e293b] font-medium">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ─── Lifetime Card ──────────────────────── */}
                <div
                    className={`bg-[#eff6ff] rounded-2xl p-5 mb-6 cursor-pointer transition-all duration-200 ${selectedPlan === 'lifetime' ? 'ring-2 ring-[#1D70F5]' : ''
                        }`}
                    onClick={() => setSelectedPlan('lifetime')}
                >
                    <div className="mb-4">
                        <h2 className="text-[20px] font-extrabold text-[#0f172a]">
                            Lifetime Access
                        </h2>
                        <p className="text-[13px] text-gray-500 font-medium mt-0.5">
                            Pay once, own the focus forever.
                        </p>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-5">
                        <span className="text-[32px] font-extrabold text-[#0f172a]">
                            {price.symbol} {price.lifetimeLabel}
                        </span>
                    </div>

                    <ul className="space-y-3">
                        {LIFETIME_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-[#1D70F5] flex items-center justify-center flex-shrink-0">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <span className="text-[14px] text-[#1e293b] font-medium">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ─── Restore Purchase ───────────────────── */}
                <div className="text-center mt-6">
                    <button
                        onClick={restoreSubscription}
                        disabled={isRestoring}
                        className="text-[13px] font-semibold text-gray-500 underline hover:text-gray-800 transition-colors disabled:opacity-60"
                    >
                        {isRestoring ? 'Restoring...' : 'Restore Purchase'}
                    </button>
                </div>
            </div>

            {/* ─── Sticky Bottom CTA ─────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="max-w-[420px] mx-auto bg-[#0f172a] rounded-t-3xl px-5 pt-5 pb-6">
                    {/* Trial / price text */}
                    <div className="text-center mb-4">
                        {selectedPlan === 'lifetime' ? (
                            <>
                                <p className="text-white text-[15px] font-semibold">
                                    One-time payment of {price.symbol} {price.lifetimeLabel}
                                </p>
                                <p className="text-gray-400 text-[12px] mt-1">
                                    Lifetime access. No recurring charges.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-white text-[15px] font-semibold">
                                    7 days free trial, then {price.symbol} {price.monthlyLabel}/month
                                </p>
                                <p className="text-gray-400 text-[12px] mt-1">
                                    No payments today! Cancel anytime.
                                </p>
                            </>
                        )}
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => handleCheckout(selectedPlan)}
                        disabled={isLoading}
                        className="w-full h-[52px] bg-[#1D70F5] hover:bg-[#1a63dc] active:scale-[0.98] text-white text-[15px] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {/* Sparkle icon */}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                                    <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor" />
                                </svg>
                                {selectedPlan === 'lifetime' ? 'BUY LIFETIME ACCESS' : 'START FREE TRIAL'}
                            </>
                        )}
                    </button>

                    {/* Footer Links */}
                    <div className="flex items-center justify-between mt-4 px-1">
                        <button
                            onClick={() => handleCheckout('yearly')}
                            className="text-[11px] font-semibold text-gray-500 tracking-wider hover:text-gray-300 transition-colors"
                        >
                            PROCEED WITH ANNUAL
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="text-[11px] font-semibold text-gray-500 tracking-wider hover:text-gray-300 transition-colors"
                        >
                            PROCEED WITH BASIC
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
