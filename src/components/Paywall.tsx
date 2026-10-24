'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useCheckout } from '@/hooks/useCheckout'
import { startCheckout, openBillingPortal, isNativeApp } from '@/lib/billing/checkout'
import { useCurrency, PRICES } from '@/lib/billing/useCurrency'
import { useToast, GlobalToastContainer } from '@/components/desktop/ui/Toast'

type BillingCycle = 'monthly' | 'yearly'

interface PaywallProps {
    /** When true, the "PROCEED WITH BASIC" button navigates to the onboarding next step */
    isOnboarding?: boolean
    /** Custom route for the "PROCEED WITH BASIC" / free tier action */
    onSkipRoute?: string
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

export default function Paywall({ isOnboarding = false, onSkipRoute }: PaywallProps) {
    const router = useRouter()
    const { plan: userPlan } = useAuth()
    const [billing, setBilling] = useState<BillingCycle>('yearly')
    const [pendingButton, setPendingButton] = useState<string | null>(null)
    const [isRestoring, setIsRestoring] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly')
    const { checkout, restore } = useCheckout()
    const cur = useCurrency()
    const toast = useToast()

    // Update selected plan when billing toggle changes
    useEffect(() => {
        if (selectedPlan !== 'lifetime') {
            setSelectedPlan(billing)
        }
    }, [billing, selectedPlan])

    // Reset pending states when user navigates back via browser
    useEffect(() => {
        const onPageShow = () => {
            setPendingButton(null)
        }
        window.addEventListener('pageshow', onPageShow)
        return () => window.removeEventListener('pageshow', onPageShow)
    }, [])

    // Price definitions
    const prices = cur ? PRICES[cur] : null
    const monthlyEquiv = cur === 'INR' ? '₹83' : '$3.33'

    // Determine the redirect after successful payment or skip
    const successRedirect = isOnboarding ? '/onboarding/name' : '/billing/success'
    const skipRoute = onSkipRoute || (isOnboarding ? '/onboarding/name' : undefined)

    const handleSkipOrBack = async () => {
        if (isOnboarding && skipRoute) {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await supabase.from('users').update({
                        plan: 'free',
                        updated_at: new Date().toISOString()
                    }).eq('id', user.id)
                }
            } catch (err) {
                console.error('Failed to set free plan:', err)
            }
            router.push(skipRoute)
        } else {
            router.back()
        }
    }

    const handleCheckout = async (planType: 'monthly' | 'yearly' | 'lifetime', buttonId?: string) => {
        const id = buttonId || planType
        if (isNativeApp()) {
            setPendingButton(id)
            try {
                const result = await checkout(planType)
                if ((result as any)?.customerInfo) {
                    router.push(successRedirect)
                    return
                }
            } catch (error: any) {
                console.error('Native checkout failed:', error)
                toast.show(error.message || 'Payment system error', 'error')
            } finally {
                setPendingButton(null)
            }
            return
        }

        setPendingButton(id)
        try {
            const result = await startCheckout(planType)
            if (!result.ok) {
                setPendingButton(null)
                if (result.code === 'already_pro') {
                    toast.show('You already have Focalyst Pro.', 'info', {
                        label: 'Manage plan',
                        onClick: () => { openBillingPortal() },
                    })
                } else {
                    toast.show(result.message || 'Could not open checkout.', 'error')
                }
            }
        } catch (error: any) {
            setPendingButton(null)
            console.error('Checkout failed:', error)
            toast.show(error.message || 'Payment system error', 'error')
        }
    }

    const restoreSubscription = async () => {
        setIsRestoring(true)
        try {
            const result = await restore()
            if (result.success) {
                router.push(successRedirect)
            } else {
                toast.show((result as any).message || 'No active purchase found.', 'info')
            }
        } catch (error: any) {
            console.error('Restore failed:', error)
            toast.show(error.message || 'Failed to restore subscription.', 'error')
        } finally {
            setIsRestoring(false)
        }
    }

    return (
        <main className="min-h-screen bg-white relative pb-[220px]">
            <GlobalToastContainer />
            <div className="max-w-[420px] mx-auto px-5 pt-5">
                {/* ─── Top Bar ──────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[22px] font-extrabold text-[#0f172a] tracking-tight">
                        Focalyst
                    </span>
                    <button
                        onClick={handleSkipOrBack}
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
                                {prices ? (
                                    billing === 'yearly' ? monthlyEquiv : prices.monthly
                                ) : (
                                    <span className="inline-block w-24 h-8 bg-blue-100 rounded animate-pulse" />
                                )}
                            </span>
                            <span className="text-[15px] text-gray-400 font-medium">
                                / month
                            </span>
                        </div>
                        {billing === 'yearly' && (
                            <p className="text-[13px] text-gray-400 mt-1">
                                {prices ? (
                                    `Billed annually at ${prices.yearly}`
                                ) : (
                                    <span className="inline-block w-36 h-4 bg-blue-100 rounded animate-pulse" />
                                )}
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
                            {prices ? (
                                prices.lifetime
                            ) : (
                                <span className="inline-block w-24 h-8 bg-blue-100 rounded animate-pulse" />
                            )}
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

                    {(userPlan === 'pro_monthly' || userPlan === 'pro_yearly') && (
                        <p style={{ color: 'var(--ink-3, #64748b)', fontSize: '13px' }} className="mt-3">
                            Your current plan keeps renewing until you cancel it in Manage plan.
                        </p>
                    )}
                </div>

                {/* ─── Plan Buttons Note ────────────────────── */}
                <p className="text-center text-[12px] text-gray-500 mb-4">
                    Final price and any taxes are shown at checkout.
                </p>

                {/* ─── Restore Purchase ───────────────────── */}
                <div className="text-center mt-4">
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
                                    {prices ? `One-time payment of ${prices.lifetime}` : 'One-time payment'}
                                </p>
                                <p className="text-gray-400 text-[12px] mt-1">
                                    Lifetime access. No recurring charges.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-white text-[15px] font-semibold">
                                    {prices ? `7 days free trial, then ${prices.monthly}/month` : '7 days free trial'}
                                </p>
                                <p className="text-gray-400 text-[12px] mt-1">
                                    No payments today! Cancel anytime.
                                </p>
                            </>
                        )}
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => handleCheckout(selectedPlan, 'main_cta')}
                        disabled={pendingButton === 'main_cta'}
                        className="w-full h-[52px] bg-[#1D70F5] hover:bg-[#1a63dc] active:scale-[0.98] text-white text-[15px] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60 cursor-pointer"
                    >
                        {pendingButton === 'main_cta' ? (
                            <span>Opening checkout</span>
                        ) : (
                            <>
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
                            onClick={() => handleCheckout('yearly', 'annual_link')}
                            disabled={pendingButton === 'annual_link'}
                            className="text-[11px] font-semibold text-gray-500 tracking-wider hover:text-gray-300 transition-colors disabled:opacity-50"
                        >
                            {pendingButton === 'annual_link' ? 'Opening checkout' : 'PROCEED WITH ANNUAL'}
                        </button>
                        <button
                            onClick={handleSkipOrBack}
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
