'use client'

import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { PlanProvider } from '@/context/PlanContext'
import { ChatProvider } from '@/context/ChatContext'
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
    return (
        <PlanProvider>
            <ChatProvider>
                <div className="min-h-screen bg-page-bg flex flex-col relative">
                    <Header />
                    <main className="flex-1 pb-20 page-fade-in">
                        {children}
                    </main>
                    <BottomNav />
                    <ChatUI />
                </div>
            </ChatProvider>
        </PlanProvider>
    )
}
