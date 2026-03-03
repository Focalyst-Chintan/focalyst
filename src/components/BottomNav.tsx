'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    PlanTabIcon,
    FocusTabIcon,
    QuickAddIcon,
    NotesTabIcon,
    InsightsTabIcon,
} from '@/components/icons'
import QuickAddMenu from './QuickAddMenu'

const NAV_ITEMS = [
    { href: '/plan', label: 'Plan', Icon: PlanTabIcon },
    { href: '/focus', label: 'Focus', Icon: FocusTabIcon },
    { href: '#quick-add', label: 'Add', Icon: QuickAddIcon, isCenter: true },
    { href: '/notes', label: 'Notes', Icon: NotesTabIcon },
    { href: '/insights', label: 'Insights', Icon: InsightsTabIcon },
]

export default function BottomNav() {
    const pathname = usePathname()
    const [quickAddOpen, setQuickAddOpen] = useState(false)

    return (
        <>
            {/* Quick Add Menu overlay */}
            <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-card-bg/50 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-end justify-around h-16 max-w-md mx-auto px-2">
                    {NAV_ITEMS.map((item) => {
                        if (item.isCenter) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => setQuickAddOpen(!quickAddOpen)}
                                    className="flex flex-col items-center gap-0.5 pt-2 pb-1 min-w-[48px]"
                                    aria-label="Quick Add"
                                >
                                    <QuickAddIcon size={24} color={quickAddOpen ? '#4A6C8C' : '#95A7B5'} />
                                    <span
                                        className={`text-[10px] font-medium ${quickAddOpen ? 'text-navy' : 'text-blue-muted'
                                            }`}
                                    >
                                        Add
                                    </span>
                                </button>
                            )
                        }

                        const isActive = pathname.startsWith(item.href)

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="flex flex-col items-center gap-0.5 pt-2 pb-1 min-w-[48px]"
                            >
                                <item.Icon
                                    size={24}
                                    color={isActive ? '#4A6C8C' : '#95A7B5'}
                                />
                                <span
                                    className={`text-[10px] font-medium ${isActive ? 'text-navy' : 'text-blue-muted'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
