'use client'

import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { PlanProvider } from '@/context/PlanContext'
import { ChatProvider } from '@/context/ChatContext'
import { I18nProvider } from '@/components/I18nProvider'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'

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

    // Guard: fire the redirect exactly once when auth resolves to no-user.
    const didRedirect = useRef(false)

    useEffect(() => {
        if (!isLoading && !user && !didRedirect.current) {
            didRedirect.current = true
            router.replace('/login')
        }
        // Reset when user logs in so future logouts can redirect again.
        if (user) {
            didRedirect.current = false
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 flex flex-col items-center justify-center">
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
                    <div className="min-h-screen bg-page-bg dark:bg-slate-950 flex flex-col relative text-navy-darker dark:text-slate-100 transition-colors duration-300">
                        <Header />
                        <main 
                            style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
                            className="flex-1 page-fade-in"
                        >
                            {children}
                        </main>
                        <BottomNav />
                        <ChatUI />
                    </div>
                </ChatProvider>
            </PlanProvider>
        </I18nProvider>
    )
}
