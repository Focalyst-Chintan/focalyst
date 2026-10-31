'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import PomodoroSection from '@/components/focus/PomodoroSection'
import CountdownSection from '@/components/focus/CountdownSection'
import BlockerCard from '@/components/focus/BlockerCard'
import { DesktopFocusPage } from '@/components/desktop/focus/DesktopFocusPage'

function FocusLoadingSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
        </div>
    )
}

function MobileFocusContent() {
    const supabase = createClient()
    const { user } = useAuth()

    const [userPlan, setUserPlan] = useState('free')
    const [userId, setUserId] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        async function fetchProfile() {
            if (!user) return
            setUserId(user.id)

            const { data: userProfile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', user.id)
                .single()

            if (userProfile) {
                setUserPlan(userProfile.plan || 'free')
            }
            setLoading(false)
        }
        fetchProfile()
    }, [supabase, user])

    if (loading) {
        return <FocusLoadingSkeleton />
    }

    return (
        <div className="min-h-dvh pb-6">
            <main className="max-w-md mx-auto p-4 pt-6">
                <PomodoroSection userPlan={userPlan} />

                <div className="my-6">
                    <BlockerCard />
                </div>

                <CountdownSection userPlan={userPlan} userId={userId} />
            </main>
        </div>
    )
}

function FocusPageSwitcher() {
    const isDesktop = useIsDesktop()

    if (isDesktop === null) {
        return <FocusLoadingSkeleton />
    }

    if (isDesktop) {
        return <DesktopFocusPage />
    }

    return <MobileFocusContent />
}

export default function FocusPage() {
    return (
        <Suspense fallback={<FocusLoadingSkeleton />}>
            <FocusPageSwitcher />
        </Suspense>
    )
}
