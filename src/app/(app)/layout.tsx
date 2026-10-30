'use client'

import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { PlanProvider } from '@/context/PlanContext'
import { ChatProvider } from '@/context/ChatContext'
import { I18nProvider } from '@/components/I18nProvider'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { DesktopShell } from '@/components/desktop/DesktopShell'
import { DesktopShellProvider } from '@/components/desktop/DesktopShellContext'
import { CreateProvider } from '@/components/desktop/create/CreateProvider'
import CheckoutIntentRunner from '@/components/billing/CheckoutIntentRunner'
import { DataEventsBridge } from '@/lib/data/useData'
import { GlobalToastContainer } from '@/components/desktop/ui/Toast'
import { OfflineBanner } from '@/components/desktop/ui/OfflineBanner'
import { useDailyMcpBonus } from '@/hooks/useDailyMcpBonus'
import { useOnboardingFollowUps } from '@/lib/onboarding/useOnboardingFollowUps'

const ChatUI = dynamic(() => import('@/components/chat/ChatUI').then(mod => mod.ChatUI), { 
    ssr: false,
    loading: () => null
})

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const isDesktop = useIsDesktop()
    useDailyMcpBonus()
    useOnboardingFollowUps()

    // Guard: fire the redirect exactly once when auth resolves to no-user.
    const didRedirect = useRef(false)

    useEffect(() => {
        if (!isLoading && !user && !didRedirect.current) {
            didRedirect.current = true
            try {
                window.dispatchEvent(new CustomEvent('fx:flush-notes'))
            } catch (e) {}
            const current = window.location.pathname + window.location.search
            const nextParam = current && current !== '/login' ? `?next=${encodeURIComponent(current)}` : ''
            router.replace(`/login${nextParam}`)
        }
        // Reset when user logs in so future logouts can redirect again.
        if (user) {
            didRedirect.current = false
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 lg:bg-transparent flex flex-col items-center justify-center">
                <div className="flex flex-col items-center space-y-5">
                    <div className="w-12 h-12 rounded-full border-4 border-[#EAE3D9] border-t-[#3D2E20] animate-spin" />
                    <span className="text-[#3D2E20] dark:text-slate-300 font-bold tracking-[0.25em] text-sm animate-pulse">FOCALYST</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return null // Will redirect in useEffect
    }

    return (
        <I18nProvider>
            <PlanProvider>
                <ChatProvider>
                    <DesktopShellProvider>
                        <CreateProvider>
                            <DataEventsBridge />
                            <CheckoutIntentRunner />
                            <OfflineBanner />
                            {/* Desktop Layout (>= 1024px) */}
                            <div className="hidden lg:contents">
                                <DesktopShell>
                                    {children}
                                </DesktopShell>
                            </div>

                            {/* Mobile Layout (< 1024px) */}
                            <div className="lg:hidden min-h-screen bg-page-bg dark:bg-slate-950 flex flex-col relative text-navy-darker dark:text-slate-100 transition-colors duration-300">
                                <div className="lg:hidden">
                                    <Header />
                                </div>
                                <main className="flex-1 page-fade-in pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0">
                                    {children}
                                </main>
                                <div className="lg:hidden">
                                    <BottomNav />
                                </div>
                                {isDesktop === false && <ChatUI />}
                                <GlobalToastContainer />
                            </div>
                        </CreateProvider>
                    </DesktopShellProvider>
                </ChatProvider>
            </PlanProvider>
        </I18nProvider>
    )
}

