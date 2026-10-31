'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase'
import { usePlan } from '@/context/PlanContext'
import { useAuth } from '@/context/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import TodoList from '@/components/plan/TodoList'
import HabitList from '@/components/plan/HabitList'
import CalendarView from '@/components/plan/CalendarView'
import dynamic from 'next/dynamic'
import { DesktopPlanPage } from '@/components/desktop/plan/DesktopPlanPage'
import { Check, X } from 'lucide-react'
import { SegmentedControl } from '@/components/mobile/ui'

const WeeklyReportModal = dynamic(
  () => import('@/components/insights/WeeklyReportModal'),
  { ssr: false }
)

type TabView = 'today' | 'calendar'

function getGreetingKey(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
}

function getFormattedDate(): { day: string; month: string; weekday: string } {
    const now = new Date()
    return {
        day: now.getDate().toString(),
        month: now.toLocaleString('en-US', { month: 'short' }),
        weekday: now.toLocaleString('en-US', { weekday: 'long' }),
    }
}

function PlanLoadingSkeleton() {
    return (
        <>
            <div className="hidden lg:flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
            <div className="px-5 pt-2 lg:hidden" aria-hidden>
                <div className="m-skel h-11 w-3/4 !rounded-xl" />
                <div className="m-skel h-4 w-1/2 mt-3 !rounded-md" />
                <div className="m-skel h-10 w-full mt-5 !rounded-full" />
                <div className="m-skel h-[60px] w-full mt-7" />
                <div className="m-skel h-[60px] w-full mt-2" />
            </div>
        </>
    )
}

function MobilePlanContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t } = useTranslation()
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState<TabView>('today')
    const [userName, setUserName] = useState<string>('User')
    const [userId, setUserId] = useState<string>(user?.id || '')
    const [showSuccess, setShowSuccess] = useState(false)
    const { getTodayEventCount } = usePlan()
    const supabase = createClient()
    const date = getFormattedDate()
    const greetingKey = getGreetingKey()
    const eventCount = getTodayEventCount()

    useEffect(() => {
        if (searchParams.get('payment') === 'success' || searchParams.get('status') === 'success') {
            setShowSuccess(true)
            const timeout = setTimeout(() => {
                router.replace('/plan')
            }, 5000)
            return () => clearTimeout(timeout)
        }
    }, [searchParams, router])

    useEffect(() => {
        async function fetchUserName() {
            if (!user) return
            setUserId(user.id)
            const { data: profile } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', user.id)
                .single()

            if (profile?.full_name) {
                setUserName(profile.full_name.split(' ')[0])
            }
        }
        fetchUserName()
    }, [user, supabase])

    return (
        <>
        {userId && <WeeklyReportModal userId={userId} />}

        <div className="px-5 pt-2 pb-4">
            {showSuccess && (
                <div role="status" className="m-glass m-glass-md mb-6 p-4 flex items-center gap-3 m-rise">
                    <span className="m-tile !bg-[color-mix(in_srgb,var(--m-success)_16%,transparent)] !border-[color-mix(in_srgb,var(--m-success)_40%,transparent)] text-[var(--m-success-text)]">
                        <Check size={20} strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="m-headline text-ink">Welcome to Pro</p>
                        <p className="m-footnote text-ink-2">Your Pro plan is active.</p>
                    </div>
                    <button
                        onClick={() => setShowSuccess(false)}
                        className="m-icon-btn m-icon-btn-plain m-press ml-auto -mr-2"
                        aria-label="Dismiss"
                    >
                        <X size={18} strokeWidth={1.75} aria-hidden />
                    </button>
                </div>
            )}
            <h1 className="m-display text-ink m-clamp-2">
                {t(`plan.${greetingKey}`)}, {userName}
            </h1>
            <p className="m-subhead text-ink-2 mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span>{date.weekday}, {date.day} {date.month}</span>
                <span aria-hidden>·</span>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className="text-ink-2 hover:text-ink underline-offset-4 hover:underline min-h-11 -my-3"
                >
                    {eventCount === 0
                        ? t('plan.noEvents')
                        : `${eventCount} ${t(eventCount > 1 ? 'plan.events' : 'plan.event')}`}
                </button>
            </p>

            <SegmentedControl
                className="mt-5 mb-7"
                label="Plan view"
                value={activeTab}
                onSelect={setActiveTab}
                options={[
                    { value: 'today', label: t('plan.today') },
                    { value: 'calendar', label: t('plan.calendar') },
                ]}
            />

            {activeTab === 'today' ? (
                <>
                    <TodoList />
                    <div className="h-7" />
                    <HabitList />
                </>
            ) : (
                <CalendarView />
            )}
        </div>
        </>
    )
}

function PlanPageSwitcher() {
    const isDesktop = useIsDesktop()

    if (isDesktop === null) {
        return <PlanLoadingSkeleton />
    }

    if (isDesktop) {
        return <DesktopPlanPage />
    }

    return <MobilePlanContent />
}

export default function PlanPage() {
    return (
        <Suspense fallback={<PlanLoadingSkeleton />}>
            <PlanPageSwitcher />
        </Suspense>
    )
}
