'use client';

import Paywall from '@/components/Paywall';
import { DesktopPaywall } from '@/components/desktop/billing/DesktopPaywall';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { isNativeApp } from '@/lib/billing/checkout';

export default function PaywallPage() {
    const isDesktop = useIsDesktop();

    if (isDesktop === null) {
        return null;
    }

    if (isDesktop && !isNativeApp()) {
        return <DesktopPaywall mode="paywall" />;
    }

    return <Paywall />;
}
