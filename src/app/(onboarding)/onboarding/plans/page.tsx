'use client'

import Paywall from '@/components/Paywall'

export default function PlansPage() {
    return (
        <Paywall
            isOnboarding={true}
            onSkipRoute="/onboarding/name"
        />
    )
}
