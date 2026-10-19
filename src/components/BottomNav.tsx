'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
    PlanTabIcon,
    FocusTabIcon,
    QuickAddIcon,
    NotesTabIcon,
    InsightsTabIcon,
} from '@/components/icons'
import QuickAddMenu from '@/components/QuickAddMenu'

const NAV_ITEMS = [
    { href: '/plan', label: 'Plan', translationKey: 'nav.plan', Icon: PlanTabIcon },
    { href: '/focus', label: 'Focus', translationKey: 'nav.focus', Icon: FocusTabIcon },
    { href: '#quick-add', label: 'Add', translationKey: 'nav.add', Icon: QuickAddIcon, isCenter: true },
    { href: '/notes', label: 'Notes', translationKey: 'nav.notes', Icon: NotesTabIcon },
    { href: '/insights', label: 'Insights', translationKey: 'nav.insights', Icon: InsightsTabIcon },
]

export default function BottomNav() {
    const pathname = usePathname()
    const [quickAddOpen, setQuickAddOpen] = useState(false)
    const { t } = useTranslation()

    return (
        <>
            {/* Quick Add Menu overlay */}
            <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

            {/* Bottom Navigation Bar */}
            <nav 
                style={{ 
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    height: 'calc(64px + env(safe-area-inset-bottom))'
                }}
                className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-card-bg/50 dark:border-slate-800 transition-colors duration-300"
            >
                <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
                    {NAV_ITEMS.map((item) => {
                        if (item.isCenter) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => setQuickAddOpen(!quickAddOpen)}
                                    className={`flex flex-col items-center gap-0.5 pt-2 pb-1 min-w-[48px] focus:outline-none transition-colors duration-200 ${
                                        quickAddOpen ? 'text-navy dark:text-accent' : 'text-blue-muted dark:text-slate-400'
                                    }`}
                                    aria-label={t('nav.add')}
                                >
                                    <QuickAddIcon size={24} color="currentColor" />
                                    <span className="text-[10px] font-medium">{t('nav.add')}</span>
                                </button>
                            )
                        }

                        const isActive = pathname.startsWith(item.href)

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex flex-col items-center gap-0.5 pt-2 pb-1 min-w-[48px] transition-colors duration-200 ${
                                    isActive ? 'text-navy dark:text-accent' : 'text-blue-muted dark:text-slate-400'
                                }`}
                            >
                                <item.Icon
                                    size={24}
                                    color="currentColor"
                                />
                                <span className="text-[10px] font-medium">
                                    {t(item.translationKey)}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
