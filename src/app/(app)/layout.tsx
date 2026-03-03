'use client'

import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { PlanProvider } from '@/context/PlanContext'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <PlanProvider>
            <div className="min-h-screen bg-page-bg flex flex-col">
                <Header />
                <main className="flex-1 pb-20">
                    {children}
                </main>
                <BottomNav />
            </div>
        </PlanProvider>
    )
}
