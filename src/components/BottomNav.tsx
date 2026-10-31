'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CalendarCheck2, ChartColumn, NotebookPen, Plus, Timer } from 'lucide-react'
import QuickAddMenu from '@/components/QuickAddMenu'
import { useKeyboardOpen } from '@/components/mobile/hooks'

const NAV_ITEMS = [
    { href: '/plan', label: 'Plan', translationKey: 'nav.plan', Icon: CalendarCheck2 },
    { href: '/focus', label: 'Focus', translationKey: 'nav.focus', Icon: Timer },
    { href: '#quick-add', label: 'Add', translationKey: 'nav.add', Icon: Plus, isCenter: true },
    { href: '/notes', label: 'Notes', translationKey: 'nav.notes', Icon: NotebookPen },
    { href: '/insights', label: 'Insights', translationKey: 'nav.insights', Icon: ChartColumn },
]

export default function BottomNav() {
    const pathname = usePathname()
    const [quickAddOpen, setQuickAddOpen] = useState(false)
    const { t } = useTranslation()
    const keyboardOpen = useKeyboardOpen()
    // Index of the active tab for the sliding pill; -1 hides it (e.g. on Account).
    const activeIndex = NAV_ITEMS.findIndex((item) => !item.isCenter && pathname.startsWith(item.href))

    return (
        <>
            {/* Quick Add Menu overlay */}
            <QuickAddMenu open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

            {/* Floating tab bar (spec 7.2). Slides away while the keyboard is open. */}
            <nav
                aria-label="Main"
                className={`fixed z-40 left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+8px)] h-16 rounded-full m-blur border border-line shadow-[var(--m-card-shadow)] transition-[transform,opacity] duration-[280ms] ease-[var(--ease)] ${
                    keyboardOpen ? 'translate-y-[calc(100%+40px)] opacity-0 pointer-events-none' : ''
                }`}
            >
                <div className="relative grid grid-cols-5 items-center h-full max-w-md mx-auto px-1.5">
                    {/* Active pill, slides between tabs */}
                    <span
                        aria-hidden
                        className={`absolute top-1/2 left-1.5 h-11 -translate-y-1/2 rounded-full bg-[var(--m-surface-strong)] border border-line transition-[transform,opacity] duration-[280ms] ease-[var(--m-spring)] ${
                            activeIndex < 0 ? 'opacity-0' : 'opacity-100'
                        }`}
                        style={{
                            width: 'calc((100% - 12px) / 5)',
                            transform: `translate(${Math.max(0, activeIndex) * 100}%, -50%)`,
                        }}
                    />
                    {NAV_ITEMS.map((item) => {
                        if (item.isCenter) {
                            return (
                                <div key={item.label} className="relative flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setQuickAddOpen(!quickAddOpen)}
                                        className={`m-press -translate-y-1.5 w-[52px] h-[52px] rounded-full flex items-center justify-center bg-[image:var(--m-grad-primary)] text-snow shadow-[var(--m-glow-strong)] focus:outline-none ${
                                            quickAddOpen ? 'rotate-45' : ''
                                        }`}
                                        aria-label={t('nav.add')}
                                        aria-expanded={quickAddOpen}
                                    >
                                        <item.Icon size={24} strokeWidth={2} aria-hidden />
                                    </button>
                                </div>
                            )
                        }

                        const isActive = pathname.startsWith(item.href)

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`m-press relative z-[1] flex flex-col items-center justify-center gap-0.5 h-11 rounded-full ${
                                    isActive ? 'text-ink' : 'text-ink-2'
                                }`}
                            >
                                <item.Icon size={22} strokeWidth={1.75} aria-hidden />
                                <span className="m-caption">
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
