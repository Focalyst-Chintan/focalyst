'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Paywall from '@/components/Paywall';
import { DesktopPaywall } from '@/components/desktop/billing/DesktopPaywall';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { isNativeApp } from '@/lib/billing/checkout';
import { useAuth } from '@/context/AuthContext';
import { isPaidPlan } from '@/lib/featureGates';
import { createClient } from '@/lib/supabase';

export default function PlansPage() {
    const isDesktop = useIsDesktop();
    const router = useRouter();
    const { user, plan, isLoading } = useAuth();

    useEffect(() => {
        let active = true;
        const checkPlan = async () => {
            if (user && isPaidPlan(plan)) {
                router.replace('/onboarding/name');
                return;
            }
            if (user) {
                const supabase = createClient();
                const { data } = await supabase
                    .from('users')
                    .select('plan, plan_expires_at')
                    .eq('id', user.id)
                    .maybeSingle();
                if (active && data && isPaidPlan(data.plan, data.plan_expires_at)) {
                    router.replace('/onboarding/name');
                }
            }
        };
        if (!isLoading) {
            checkPlan();
        }
        return () => {
            active = false;
        };
    }, [isLoading, user, plan, router]);

    if (isDesktop === null || isLoading || (user && isPaidPlan(plan))) {
        return null;
    }

    if (isDesktop && !isNativeApp()) {
        return <DesktopPaywall mode="onboarding" />;
    }

    return (
        <Paywall
            isOnboarding={true}
            onSkipRoute="/onboarding/name"
        />
    );
}
