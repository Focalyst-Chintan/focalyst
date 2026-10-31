'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useCheckout } from '@/hooks/useCheckout'
import { startCheckout, openBillingPortal, isNativeApp } from '@/lib/billing/checkout'
import { hasPro } from '@/lib/billing/proStatus'
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
    'Up to 3 countdowns',
    'More Focalyst AI messages every day',
    'AI productivity score',
    'Weekly and monthly insights',
    'Unlimited notes',
    'Priority support',
]

const LIFETIME_FEATURES = [
    'All future updates',
    'Priority support',
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

    // If the user already has Pro by users.plan, bypass the paywall automatically
    useEffect(() => {
        let active = true
        const checkExistingPro = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('plan, plan_expires_at')
                    .eq('id', user.id)
                    .maybeSingle()
                if (active && hasPro(data, false)) {
                    router.replace(successRedirect)
                }
            }
        }
        checkExistingPro()
        return () => { active = false }
    }, [router, successRedirect])

    const restoreSubscription = async () => {
        setIsRestoring(true)
        try {
            const result = await restore()
            if (result.success) {
                if (isNativeApp()) {
                    alert(`${(result as any).title || 'Focalyst Pro is active'}\n\n${(result as any).message || 'Your purchase is restored.'}`)
                } else {
                    toast.show('Your purchase is restored.', 'success')
                }
                router.push(successRedirect)
            } else {
                if (isNativeApp()) {
                    const title = (result as any).title || 'No purchases found'
                    const msg = (result as any).message || 'We could not find any active purchases.'
                    alert(`${title}\n\n${msg}`)
                } else {
                    toast.show((result as any).message || 'No active purchase found.', 'info')
                }
            }
        } catch (error: any) {
            console.error('Restore failed:', error)
            toast.show(error.message || 'Failed to restore subscription.', 'error')
        } finally {
            setIsRestoring(false)
        }
    }

    return (
        <main className="min-h-[100dvh] bg-canvas text-ink relative pb-[260px]">
            <div aria-hidden className="m-ambient" />
            <GlobalToastContainer />
            <div className="max-w-[420px] mx-auto px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
                {/* ─── Top Bar ──────────────────────────────── */}
                <div className="flex items-center justify-between mb-5">
                    <span className="font-ui font-semibold text-[15px] tracking-[0.35em] text-ink">
                        FOCALYST
                    </span>
                    <button
                        onClick={handleSkipOrBack}
                        className="m-icon-btn m-press -mr-1"
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ─── Hero ─────────────────────────────────── */}
                <div className="rounded-[32px] p-6 mb-6 bg-[image:var(--m-grad-brand)] text-snow shadow-[var(--m-glow)] relative overflow-hidden">
                    <div aria-hidden className="m-hero-grid opacity-60" />
                    <h1 className="m-display text-snow relative">
                        Plan, focus and grow with Pro.
                    </h1>
                    <p className="m-body text-snow/80 mt-3 relative">
                        Plan your days, focus deeply and see how you are growing, with everything Focalyst can do.
                    </p>
                </div>

                {/* ─── Billing Toggle ──────────────────────── */}
                <div className="m-seg mb-6" role="tablist" aria-label="Billing">
                    <span aria-hidden className="m-seg-thumb" style={{ width: 'calc((100% - 6px) / 2)', transform: `translateX(${billing === 'yearly' ? 100 : 0}%)` }} />
                    <button
                        role="tab"
                        aria-selected={billing === 'monthly'}
                        onClick={() => setBilling('monthly')}
                        className="m-seg-btn"
                    >
                        Monthly
                    </button>
                    <button
                        role="tab"
                        aria-selected={billing === 'yearly'}
                        onClick={() => setBilling('yearly')}
                        className="m-seg-btn inline-flex items-center justify-center gap-1.5"
                    >
                        Yearly
                        <span className={`m-caption !text-[11px] px-1.5 h-5 inline-flex items-center rounded-full whitespace-nowrap ${billing === 'yearly' ? 'bg-snow/20 text-snow' : 'bg-primary-soft text-primary-text'}`}>
                            2 months free
                        </span>
                    </button>
                </div>

                {/* ─── Pro Card ────────────────────────────── */}
                <div
                    className={`m-glass relative p-5 mb-3 cursor-pointer transition-[border-color,box-shadow] duration-200 ${selectedPlan !== 'lifetime' ? '!border-2 !border-[var(--m-brand-400)] shadow-[var(--m-glow)]' : ''
                        }`}
                    onClick={() => setSelectedPlan(billing)}
                    role="radio"
                    aria-checked={selectedPlan !== 'lifetime'}
                >
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h2 className="m-title-3 text-ink">
                                {billing === 'yearly' ? 'Pro yearly' : 'Pro monthly'}
                            </h2>
                            <p className="m-footnote text-ink-2 mt-1">
                                Everything in Free, plus the Pro tools.
                            </p>
                        </div>
                        <span className="m-chip m-chip-info !h-6 !text-[12px]">Pro</span>
                    </div>

                    <div className="mb-5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="m-stat-l text-ink">
                                {prices ? (
                                    billing === 'yearly' ? monthlyEquiv : prices.monthly
                                ) : (
                                    <span className="m-skel inline-block w-24 h-8 !rounded-lg align-middle" />
                                )}
                            </span>
                            <span className="m-subhead text-ink-2">
                                / month
                            </span>
                        </div>
                        {billing === 'yearly' && (
                            <p className="m-footnote text-ink-2 mt-1">
                                {prices ? (
                                    `Billed yearly at ${prices.yearly}`
                                ) : (
                                    <span className="m-skel inline-block w-36 h-4 !rounded-md" />
                                )}
                            </p>
                        )}
                    </div>

                    <ul className="space-y-3">
                        {PRO_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-[image:var(--m-grad-primary)] flex items-center justify-center flex-shrink-0" aria-hidden>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                                <span className="m-subhead text-ink">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ─── Lifetime Card ──────────────────────── */}
                <div
                    className={`m-glass p-5 mb-6 cursor-pointer transition-[border-color,box-shadow] duration-200 ${selectedPlan === 'lifetime' ? '!border-2 !border-[var(--m-brand-400)] shadow-[var(--m-glow)]' : ''
                        }`}
                    onClick={() => setSelectedPlan('lifetime')}
                    role="radio"
                    aria-checked={selectedPlan === 'lifetime'}
                >
                    <div className="mb-4">
                        <h2 className="m-title-3 text-ink">
                            Lifetime
                        </h2>
                        <p className="m-footnote text-ink-2 mt-1">
                            Pay once and keep Pro for good.
                        </p>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-5">
                        <span className="m-stat-l text-ink">
                            {prices ? (
                                prices.lifetime
                            ) : (
                                <span className="m-skel inline-block w-24 h-8 !rounded-lg align-middle" />
                            )}
                        </span>
                    </div>

                    <ul className="space-y-3">
                        {LIFETIME_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-[image:var(--m-grad-primary)] flex items-center justify-center flex-shrink-0" aria-hidden>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                                <span className="m-subhead text-ink">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {(userPlan === 'pro_monthly' || userPlan === 'pro_yearly') && (
                        <p className="m-footnote text-ink-2 mt-3">
                            Your current plan keeps renewing until you cancel it in Manage plan.
                        </p>
                    )}
                </div>

                {/* ─── Plan Buttons Note ────────────────────── */}
                <p className="text-center m-footnote text-ink-2 mb-2">
                    Final price and any taxes are shown at checkout.
                </p>

                {/* ─── Restore Purchase ───────────────────── */}
                <div className="text-center">
                    <button
                        onClick={restoreSubscription}
                        disabled={isRestoring}
                        className="m-btn m-btn-ghost m-press disabled:opacity-60"
                    >
                        {isRestoring ? 'Restoring' : 'Restore purchase'}
                    </button>
                </div>
            </div>

            {/* ─── Sticky Bottom CTA ─────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="max-w-[420px] mx-auto m-blur border border-line border-b-0 rounded-t-[32px] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-glass)]">
                    {/* Trial / price text */}
                    <div className="text-center mb-4">
                        {selectedPlan === 'lifetime' ? (
                            <>
                                <p className="m-callout !font-semibold text-ink">
                                    {prices ? `One-time payment of ${prices.lifetime}` : 'One-time payment'}
                                </p>
                                <p className="m-footnote text-ink-2 mt-1">
                                    Yours for good. No recurring charges.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="m-callout !font-semibold text-ink">
                                    {prices ? `7 days free, then ${prices.monthly} a month` : '7 days free'}
                                </p>
                                <p className="m-footnote text-ink-2 mt-1">
                                    Nothing to pay today. Cancel anytime.
                                </p>
                            </>
                        )}
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => handleCheckout(selectedPlan, 'main_cta')}
                        disabled={pendingButton === 'main_cta'}
                        className="m-btn m-btn-primary m-press w-full"
                    >
                        {pendingButton === 'main_cta' ? (
                            <span>Opening checkout</span>
                        ) : (
                            <>
                                {selectedPlan === 'lifetime' ? 'Buy lifetime' : 'Start free trial'}
                            </>
                        )}
                    </button>

                    {/* Footer Links */}
                    <div className="flex items-center justify-between mt-2 -mx-2">
                        <button
                            onClick={() => handleCheckout('yearly', 'annual_link')}
                            disabled={pendingButton === 'annual_link'}
                            className="m-btn m-btn-ghost m-press !text-[13px] disabled:opacity-50"
                        >
                            {pendingButton === 'annual_link' ? 'Opening checkout' : 'Choose yearly'}
                        </button>
                        <button
                            onClick={handleSkipOrBack}
                            className="m-btn m-btn-ghost m-press !text-[13px] !text-ink-2"
                        >
                            Continue with Free
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
