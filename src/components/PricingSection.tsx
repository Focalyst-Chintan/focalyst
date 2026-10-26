'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { startCheckout, openBillingPortal } from '@/lib/billing/checkout';
import { useCurrency, PRICES } from '@/lib/billing/useCurrency';
import { useToast } from '@/components/desktop/ui/Toast';

import { saveCheckoutIntent } from '@/lib/billing/checkoutIntent';

export interface PricingSectionProps {
    mode?: 'landing' | 'paywall' | 'onboarding' | 'pricing';
    onFree?: () => void;
    currentPlan?: string | null;
}

export default function PricingSection({
    mode = 'landing',
    onFree,
    currentPlan,
}: PricingSectionProps = {}) {
    const router = useRouter();
    const [isYearly, setIsYearly] = useState<boolean>(false);
    const [pendingButton, setPendingButton] = useState<string | null>(null);
    const supabase = createClient();
    const cur = useCurrency();
    const toast = useToast();

    const isLanding = mode === 'landing';
    const prices = cur ? PRICES[cur] : null;

    useEffect(() => {
        const onPageShow = () => {
            setPendingButton(null);
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, []);

    const handleCheckout = async (planType: 'monthly' | 'yearly' | 'lifetime', buttonId?: string) => {
        const id = buttonId || planType;
        setPendingButton(id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (mode === 'landing' || mode === 'pricing') {
                    saveCheckoutIntent(planType);
                    router.push(`/login?mode=signup&plan=${planType}`);
                    return;
                }
                router.push('/login?next=/paywall');
                return;
            }

            const result = await startCheckout(
                planType,
                mode === 'pricing' ? { returnPath: '/pricing' } : undefined
            );
            if (!result.ok) {
                setPendingButton(null);
                if (result.code === 'already_pro') {
                    toast.show('You already have Focalyst Pro.', 'info', {
                        label: 'Manage plan',
                        onClick: () => { openBillingPortal(); },
                    });
                } else {
                    toast.show(result.message || 'Could not open checkout.', 'error');
                }
            }
        } catch (error: any) {
            setPendingButton(null);
            console.error('Checkout failed:', error);
            toast.show(error.message || 'Payment system error', 'error');
        }
    };

    const isProCurrent = currentPlan === 'pro_monthly' || currentPlan === 'pro_yearly';
    const isLifetimeCurrent = currentPlan === 'lifetime';

    const freeButtonLabel =
        mode === 'onboarding'
            ? 'Continue with Free'
            : mode === 'paywall'
            ? 'Stay on Free'
            : 'Start for Free';

    const handleFreeClick = () => {
        if (mode === 'landing' || mode === 'pricing') {
            router.push('/login');
        } else if (onFree) {
            onFree();
        }
    };

    const proButtonDisabled = pendingButton === 'pro' || isProCurrent || isLifetimeCurrent;
    const proButtonLabel =
        pendingButton === 'pro'
            ? 'Opening checkout'
            : isProCurrent
            ? 'Current plan'
            : 'Get Pro Plan';

    const lifetimeButtonDisabled = pendingButton === 'lifetime' || isLifetimeCurrent;
    const lifetimeButtonLabel =
        pendingButton === 'lifetime'
            ? 'Opening checkout'
            : isLifetimeCurrent
            ? 'Your plan'
            : 'Get Lifetime';

    const sectionClasses = isLanding
        ? 'w-full bg-[#05070F] py-16 md:py-[100px] px-[28px] md:px-8 border-t border-white/5 relative'
        : mode === 'pricing'
        ? 'w-full py-8 md:py-12 px-4 md:px-8 relative'
        : 'w-full relative';

    return (
        <section id={isLanding ? 'pricing' : undefined} className={sectionClasses}>
            <div className="max-w-[1100px] mx-auto flex flex-col items-center">
                {/* Landing Header Elements */}
                {isLanding && (
                    <>
                        {/* Eyebrow */}
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF] mb-4">
                            PRICING
                        </span>

                        {/* Headline */}
                        <h2 className="font-display text-[32px] md:text-[54px] font-normal text-center leading-[1.05] tracking-[-0.015em] text-snow mb-3">
                            Plans that grow with you.
                        </h2>

                        {/* Subheadline */}
                        <p className="font-ui text-[#A3ADC8] text-[15px] md:text-[18px] text-center mb-8 md:mb-12">
                            Start free. Upgrade when you're ready.
                        </p>
                    </>
                )}

                {/* Toggle Pill Container */}
                <div className="relative mb-12 md:mb-16">
                    <div className="flex items-center bg-[#0B1020]/90 rounded-full p-1 w-[260px] md:w-[320px] h-10 md:h-[50px] mx-auto relative border border-white/10 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setIsYearly(false)}
                            className={`flex-1 h-full rounded-full transition-all text-xs md:text-sm font-semibold font-ui cursor-pointer ${
                                !isYearly ? 'bg-snow text-[#05070F] shadow-sm' : 'text-[#A3ADC8] hover:text-snow'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsYearly(true)}
                            className={`flex-1 h-full rounded-full transition-all text-xs md:text-sm font-semibold font-ui cursor-pointer ${
                                isYearly ? 'bg-snow text-[#05070F] shadow-sm' : 'text-[#A3ADC8] hover:text-snow'
                            }`}
                        >
                            Yearly
                        </button>
                    </div>
                    {/* Floating Badge */}
                    <span className="absolute -top-3 md:-top-3.5 left-[calc(50%+25px)] md:left-[calc(50%+45px)] bg-[#1951FC] border border-[#3781FC]/40 text-snow text-[10px] md:text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md">
                        Save 16%
                    </span>
                </div>

                {/* 3-Column Pricing Cards Layout */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch">
                    
                    {/* CARD 1: FREE */}
                    <div className="bg-[#0B1020]/70 rounded-[20px] p-6 md:p-9 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col justify-between transition-transform duration-200 hover:scale-[1.01]">
                        <div>
                            <span className="text-[#6FA4FF] text-[12px] md:text-[13px] tracking-[0.12em] font-semibold uppercase block mb-4">
                                FREE
                            </span>
                            <div className="flex items-baseline gap-1.5 mb-6">
                                <span className="text-[38px] md:text-[48px] font-bold text-snow">
                                    {cur === 'INR' ? '₹0' : '$0'}
                                </span>
                                <span className="text-[14px] md:text-[15px] text-[#A3ADC8] font-medium">
                                    forever
                                </span>
                            </div>
                            <ul className="space-y-3.5 mb-8">
                                {[
                                    'Unlimited tasks',
                                    '2 habits',
                                    '5 notes',
                                    '4 Pomodoro presets',
                                    '5 AI messages/day'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-[#6FA4FF] flex-shrink-0 mt-1" />
                                        <span className="text-[#A3ADC8] text-[14px] font-medium leading-relaxed">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            type="button"
                            onClick={handleFreeClick}
                            className="w-full py-3 px-4 border border-white/15 bg-white/5 hover:bg-white/10 text-snow font-semibold rounded-full text-center block text-sm transition-all cursor-pointer"
                        >
                            {freeButtonLabel}
                        </button>
                    </div>

                    {/* CARD 2: PRO (Highlighted) */}
                    <div className="relative bg-[#0B1020]/90 rounded-[20px] p-6 md:p-9 md:py-[44px] border border-[#3781FC]/60 ring-1 ring-[#1951FC]/40 flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02] shadow-[0_16px_50px_-10px_rgba(25,81,252,0.35)] backdrop-blur-xl">
                        {/* Most Popular Badge */}
                        <div className="absolute -top-3 right-6">
                            <span className="bg-[#1951FC] border border-[#3781FC]/50 text-snow text-[10px] font-semibold px-3 py-1 rounded-full tracking-wider uppercase shadow-md">
                                MOST POPULAR
                            </span>
                        </div>
                        <div>
                            <span className="text-[#6FA4FF] text-[12px] md:text-[13px] tracking-[0.12em] font-semibold uppercase block mb-4">
                                PRO
                            </span>
                            <div className="flex items-baseline gap-1.5 mb-6">
                                <span className={`text-[38px] md:text-[48px] font-bold text-snow ${!isYearly ? 'inline-block' : 'hidden'}`}>
                                    {prices ? prices.monthly : (cur === 'INR' ? '₹99' : '$4.99')}
                                </span>
                                <span className={`text-[38px] md:text-[48px] font-bold text-snow ${isYearly ? 'inline-block' : 'hidden'}`}>
                                    {prices ? prices.yearly : (cur === 'INR' ? '₹999' : '$39.99')}
                                </span>
                                <span className={`text-[14px] md:text-[15px] font-medium ${isYearly ? 'text-[#6FA4FF]' : 'text-[#A3ADC8]'}`}>
                                    / {isYearly ? 'year' : 'month'}
                                </span>
                            </div>
                            <ul className="space-y-3.5 mb-8">
                                {[
                                    'Everything in Free',
                                    'More habits, notes and voice notes',
                                    'Custom focus timers and every preset',
                                    'More Focalyst AI messages every day',
                                    'AI Productivity Score',
                                    'Weekly Catalyst Report',
                                    'Up to 3 countdowns',
                                    'App blocker (mobile)'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-[#3781FC] flex-shrink-0 mt-1" />
                                        <span className="text-snow text-[14px] font-medium leading-relaxed">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleCheckout(isYearly ? 'yearly' : 'monthly', 'pro')}
                            disabled={proButtonDisabled}
                            className="w-full py-3.5 px-4 bg-snow hover:bg-snow/90 text-[#05070F] font-semibold rounded-full text-center block text-sm shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {proButtonLabel}
                        </button>
                    </div>

                    {/* CARD 3: LIFETIME */}
                    <div className="bg-[#0B1020]/70 rounded-[20px] p-6 md:p-9 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col justify-between transition-transform duration-200 hover:scale-[1.01]">
                        <div>
                            <span className="text-[#6FA4FF] text-[12px] md:text-[13px] tracking-[0.12em] font-semibold uppercase block mb-4">
                                LIFETIME
                            </span>
                            <div className="flex items-baseline gap-1.5 mb-6">
                                <span className="text-[38px] md:text-[48px] font-bold text-snow">
                                    {prices ? prices.lifetime : (cur === 'INR' ? '₹2,999' : '$99.99')}
                                </span>
                                <span className="text-[14px] md:text-[15px] text-[#A3ADC8] font-medium">
                                    one-time
                                </span>
                            </div>
                            <ul className="space-y-3.5 mb-8">
                                {[
                                    'Everything in Free',
                                    'More habits, notes and voice notes',
                                    'Custom focus timers and every preset',
                                    'More Focalyst AI messages every day',
                                    'AI Productivity Score',
                                    'Weekly Catalyst Report',
                                    'Up to 3 countdowns',
                                    'App blocker (mobile)',
                                    'All future updates included'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-[#6FA4FF] flex-shrink-0 mt-1" />
                                        <span className="text-[#A3ADC8] text-[14px] font-medium leading-relaxed">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => handleCheckout('lifetime', 'lifetime')}
                                disabled={lifetimeButtonDisabled}
                                className="w-full py-3 px-4 border border-snow/60 bg-[#0B1020]/70 hover:bg-[#0B1020] text-snow font-semibold rounded-full text-center block text-sm transition-all shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {lifetimeButtonLabel}
                            </button>
                            {isProCurrent && (
                                <p
                                    style={{ color: 'var(--ink-3)' }}
                                    className="mt-2 text-center text-[13px]"
                                >
                                    Your current plan keeps renewing until you cancel it in Manage plan.
                                </p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Plain server-rendered line visible without JavaScript */}
                <p className="text-center text-[13.5px] text-[#A3ADC8] mt-8 max-w-[720px] mx-auto leading-relaxed">
                    Pro: $4.99 a month or $39.99 a year. Lifetime: $99.99 one-time. In India: ₹99 a month, ₹999 a year or ₹2,999 Lifetime. Final price and any taxes are shown at checkout.
                </p>

                {/* Footer Trust Text */}
                <p className="text-[#6B7591] text-[12px] md:text-[13px] text-center mt-4 font-medium">
                    Payments secured by Polar · Cancel monthly or yearly plans anytime
                </p>
            </div>
        </section>
    );
}
