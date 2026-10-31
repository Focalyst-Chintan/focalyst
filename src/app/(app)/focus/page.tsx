'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useTranslation } from 'react-i18next'
import PomodoroSection from '@/components/focus/PomodoroSection'
import CountdownSection from '@/components/focus/CountdownSection'
import BlockerCard from '@/components/focus/BlockerCard'
import { DesktopFocusPage } from '@/components/desktop/focus/DesktopFocusPage'

function FocusLoadingSkeleton() {
    return (
        <>
            <div className="hidden lg:flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            </div>
            <div className="px-5 pt-2 lg:hidden" aria-hidden>
                <div className="m-skel h-9 w-32 !rounded-xl" />
                <div className="m-skel h-[340px] w-full mt-5 !rounded-[32px]" />
                <div className="m-skel h-[76px] w-full mt-4 !rounded-[24px]" />
            </div>
        </>
    )
}

function MobileFocusContent() {
    const supabase = createClient()
    const { user } = useAuth()
    const { t } = useTranslation()

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
        <div className="pb-6">
            <div className="max-w-md mx-auto px-5 pt-2">
                <h1 className="m-title-1 text-ink mb-5">{t('nav.focus')}</h1>

                <PomodoroSection userPlan={userPlan} />

                <div className="mt-3 mb-7">
                    <BlockerCard />
                </div>

                <CountdownSection userPlan={userPlan} userId={userId} />
            </div>
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
