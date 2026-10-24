'use client';

import Paywall from '@/components/Paywall';
import { DesktopPaywall } from '@/components/desktop/billing/DesktopPaywall';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { isNativeApp } from '@/lib/billing/checkout';

export default function PlansPage() {
    const isDesktop = useIsDesktop();

    if (isDesktop === null) {
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
