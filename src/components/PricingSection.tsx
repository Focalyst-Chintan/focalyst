'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useCheckout } from '@/hooks/useCheckout'

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? match[2] : null
}

export default function PricingSection() {
    const router = useRouter()
    const [isYearly, setIsYearly] = useState<boolean>(false)
    const [region, setRegion] = useState<'IN' | 'INT'>('INT')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const { checkout } = useCheckout()
    const supabase = createClient()

    useEffect(() => {
        const r = getCookie('user-region')
        if (r === 'IN' || r === 'INT') {
            setRegion(r)
        } else {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
            if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') {
                setRegion('IN')
            } else {
                setRegion('INT')
            }
        }
    }, [])

    const isIndia = region === 'IN'

    const handleCheckout = async (planType: 'monthly' | 'yearly' | 'lifetime') => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login?redirect=/app')
                return
            }

            const result = await checkout(planType, region, false)
            if (result?.success) {
                if (result.customerInfo) {
                    router.push('/dashboard?payment=success')
                    return
                }

                if (result.provider === 'polar' && result.url) {
                    window.location.href = result.url
                    return
                }

                if (result.provider === 'razorpay') {
                    openRazorpayCheckout(result)
                }
            }
        } catch (error: any) {
            console.error('Checkout failed:', error)
            alert(`Payment system error: ${error.message}`)
            setIsLoading(false)
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
                router.push('/dashboard?payment=success')
            },
            modal: {
                ondismiss: () => {
                    setIsLoading(false)
                },
            },
            theme: { color: '#ed6c4c' },
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
        <section id="pricing" className="w-full bg-[#1c2e4a] py-12 md:py-[100px] px-[28px] md:px-8 transition-colors duration-300">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="max-w-[1100px] mx-auto flex flex-col items-center">
                {/* Eyebrow */}
                <span className="text-[#cad6e4]/60 md:text-[#cad6e4]/50 text-[11px] md:text-[12px] tracking-[0.18em] uppercase font-bold text-center block mb-3">
                    PRICING
                </span>

                {/* Headline */}
                <h2 className="text-white text-[32px] md:text-[60px] font-bold text-center leading-tight mb-3">
                    Plans that grow with you.
                </h2>

                {/* Subheadline */}
                <p className="text-white/60 text-[15px] md:text-[18px] text-center mb-8 md:mb-12">
                    Start free. Upgrade when you're ready.
                </p>

                {/* Toggle Pill Container */}
                <div className="relative mb-12 md:mb-16">
                    <div className="flex items-center bg-white/10 rounded-full p-1 w-[260px] md:w-[320px] h-10 md:h-[52px] mx-auto relative border border-white/10">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`flex-1 h-full rounded-full transition-all text-xs md:text-sm font-semibold ${
                                !isYearly ? 'bg-white text-[#1c2e4a] shadow-sm' : 'text-white hover:text-white/80'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`flex-1 h-full rounded-full transition-all text-xs md:text-sm font-semibold ${
                                isYearly ? 'bg-white text-[#1c2e4a] shadow-sm' : 'text-white hover:text-white/80'
                            }`}
                        >
                            Yearly
                        </button>
                    </div>
                    {/* Floating Badge */}
                    <span className="absolute -top-3 md:-top-4 left-[calc(50%+25px)] md:left-[calc(50%+45px)] bg-[#ed6c4c] text-white text-[10px] md:text-xs font-bold px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap shadow-md">
                        Save 16%
                    </span>
                </div>

                {/* 3-Column Pricing Cards Layout */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
                    
                    {/* CARD 1: FREE */}
                    <div className="bg-[#f9fbfc] rounded-[20px] p-6 md:p-9 border border-[#cad6e4]/30 flex flex-col justify-between transition-transform duration-200 hover:scale-[1.01]">
                        <div>
                            <span className="text-[#1c2e4a] text-[13px] md:text-[14px] tracking-[0.1em] font-bold block mb-4">
                                FREE
                            </span>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-[40px] md:text-[52px] font-bold text-[#1c2e4a]">
                                    {isIndia ? '₹0' : '$0'}
                                </span>
                                <span className="text-[14px] md:text-[16px] text-[#4a6c8c] font-medium">
                                    forever
                                </span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Unlimited tasks',
                                    '2 habits',
                                    '5 notes',
                                    '4 Pomodoro presets',
                                    '5 AI messages/day'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-[#1c2e4a] flex-shrink-0 mt-0.5" />
                                        <span className="text-[#4a6c8c] text-[14px] md:text-[15px] font-medium leading-tight">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-3 px-4 border border-[#1c2e4a] text-[#1c2e4a] hover:bg-[#1c2e4a]/5 transition-colors font-bold rounded-xl text-center block text-sm md:text-base"
                        >
                            Start for Free
                        </button>
                    </div>

                    {/* CARD 2: PRO (Highlighted) */}
                    <div className="relative bg-[#0d1f38] rounded-[20px] p-6 md:p-9 md:py-[48px] border-2 border-[#ed6c4c] flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02] shadow-xl">
                        {/* Most Popular Badge */}
                        <div className="absolute -top-3 right-6">
                            <span className="bg-[#ed6c4c] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">
                                MOST POPULAR
                            </span>
                        </div>
                        <div>
                            <span className="text-white text-[13px] md:text-[14px] tracking-[0.1em] font-bold block mb-4">
                                PRO
                            </span>
                            <div className="flex items-baseline gap-1.5 mb-6">
                                <span className="text-[40px] md:text-[52px] font-bold text-white">
                                    {isIndia ? (
                                        isYearly ? '₹999' : '₹99'
                                    ) : (
                                        isYearly ? '$39.99' : '$4.99'
                                    )}
                                </span>
                                <span className={`text-[14px] md:text-[16px] font-medium ${isYearly ? 'text-[#ed6c4c]' : 'text-white/60'}`}>
                                    / {isYearly ? 'year' : 'month'}
                                </span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Everything in Free',
                                    'Unlimited habits and notes',
                                    'Custom Pomodoro sessions',
                                    'Unlimited AI chat',
                                    'AI Productivity Score',
                                    'App blocker (mobile)'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-[#ed6c4c] flex-shrink-0 mt-0.5" />
                                        <span className="text-white/75 text-[14px] md:text-[15px] font-medium leading-tight">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => handleCheckout(isYearly ? 'yearly' : 'monthly')}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-[#ed6c4c] hover:bg-[#d95d3f] text-white font-bold rounded-xl text-center block text-sm md:text-base transition-colors disabled:opacity-60"
                        >
                            {isLoading ? 'Processing...' : 'Get Pro Plan'}
                        </button>
                    </div>

                    {/* CARD 3: LIFETIME */}
                    <div className="bg-[#f9fbfc] rounded-[20px] p-6 md:p-9 border border-[#cad6e4]/30 flex flex-col justify-between transition-transform duration-200 hover:scale-[1.01]">
                        <div>
                            <span className="text-[#1c2e4a] text-[13px] md:text-[14px] tracking-[0.1em] font-bold block mb-4">
                                LIFETIME
                            </span>
                            <div className="flex items-baseline gap-1.5 mb-6">
                                <span className="text-[40px] md:text-[52px] font-bold text-[#1c2e4a]">
                                    {isIndia ? '₹2,999' : '$79.99'}
                                </span>
                                <span className="text-[14px] md:text-[16px] text-[#4a6c8c] font-medium">
                                    one-time
                                </span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Everything in Free',
                                    'Unlimited habits and notes',
                                    'Custom Pomodoro sessions',
                                    'Unlimited AI chat',
                                    'AI Productivity Score',
                                    'App blocker (mobile)',
                                    'All future updates included'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-[#1c2e4a] flex-shrink-0 mt-0.5" />
                                        <span className="text-[#4a6c8c] text-[14px] md:text-[15px] font-medium leading-tight">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => handleCheckout('lifetime')}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-[#1c2e4a] hover:bg-[#15233a] text-white font-bold rounded-xl text-center block text-sm md:text-base transition-colors disabled:opacity-60"
                        >
                            {isLoading ? 'Processing...' : 'Get Lifetime'}
                        </button>
                    </div>

                </div>

                {/* Footer Trust Text */}
                <p className="text-white/40 text-[13px] text-center mt-12 font-medium">
                    All prices inclusive of GST · Payments secured by Razorpay & Polar · Cancel anytime
                </p>
            </div>
        </section>
    )
}
