'use client'

import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { PlanProvider } from '@/context/PlanContext'
import { ChatProvider } from '@/context/ChatContext'
import { AIChatOverlay } from '@/components/chat/AIChatOverlay'

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
                    <main className="flex-1 pb-20">
                        {children}
                    </main>
                    <BottomNav />
                    <AIChatOverlay />
                </div>
            </ChatProvider>
        </PlanProvider>
    )
}
