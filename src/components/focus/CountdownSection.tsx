'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'

import { Countdown } from '@/types'
import { PendingCountdownCard } from '@/components/onboarding/PendingCountdownCard'
import { MoreHorizontal, Plus } from 'lucide-react'

export default function CountdownSection({ userId, userPlan }: { userPlan: string, userId: string }) {
    const router = useRouter()
    const supabase = createClient()
    const { t } = useTranslation()

    const [countdowns, setCountdowns] = useState<Countdown[]>([])
    const [loading, setLoading] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    useEffect(() => {
        const fetchCountdowns = async () => {
            const { data } = await supabase
                .from('countdowns')
                .select('id, user_id, event_name, target_date, is_active')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('target_date', { ascending: true })
            setCountdowns(data || [])
            setLoading(false)
        }
        fetchCountdowns()
    }, [userId, supabase])

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this countdown?')) {
            await supabase.from('countdowns').delete().eq('id', id)
            setCountdowns(prev => prev.filter(c => c.id !== id))
        }
    }

    return (
        <section className="mt-8">
            <h2 className="m-title-3 text-ink mb-4">{t('focus.countdown')}</h2>
            <PendingCountdownCard className="mb-4" />

            {loading ? (
                <div className="m-skel h-[120px] w-full !rounded-[24px]" aria-hidden />
            ) : (
                <div className="flex flex-col gap-3 relative">
                    {countdowns.map((countdown, index) => {
                        // calculate days to go
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const target = new Date(countdown.target_date)
                        target.setHours(0, 0, 0, 0)
                        const diffTime = target.getTime() - today.getTime()
                        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

                        // dynamic z-index to stop lower cards from overlapping the dropdown of upper cards
                        const zIndex = openMenuId === countdown.id ? 50 : countdowns.length - index

                        return (
                            <div key={countdown.id} className="m-glass p-5 flex flex-col" style={{ zIndex }}>
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex items-baseline gap-2">
                                        <span className="m-stat-l text-ink">{daysRemaining}</span>
                                        <span className="m-subhead text-ink-2">
                                            {daysRemaining === 1 ? t('focus.dayLeft') : t('focus.daysLeft')}
                                        </span>
                                    </div>

                                    {/* Three dots menu */}
                                    <div className="relative z-50 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setOpenMenuId(openMenuId === countdown.id ? null : countdown.id)
                                            }}
                                            className="m-press w-11 h-11 -mr-3 -mt-2 flex items-center justify-center rounded-full text-ink-2 hover:bg-[var(--m-surface-strong)]"
                                            aria-label={`More options for ${countdown.event_name}`}
                                            aria-haspopup="menu"
                                            aria-expanded={openMenuId === countdown.id}
                                        >
                                            <MoreHorizontal size={20} strokeWidth={1.75} className="pointer-events-none" aria-hidden />
                                        </button>

                                        {openMenuId === countdown.id && (
                                            <>
                                                {/* Transparent backdrop to catch clicks outside the menu */}
                                                <div
                                                    className="fixed inset-0 z-[998] cursor-default"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setOpenMenuId(null)
                                                    }}
                                                />
                                                <div role="menu" className="absolute right-0 top-full mt-1 min-w-[160px] m-blur border border-line rounded-[16px] shadow-[var(--shadow-glass)] p-1.5 z-[999] animate-[m-rise_200ms_var(--ease)_both]">
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            router.push(`/focus/countdown/edit?id=${countdown.id}`)
                                                        }}
                                                        className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-ink hover:bg-[var(--m-surface-strong)] active:bg-[var(--m-surface-strong)] transition-colors"
                                                    >
                                                        {t('settings.editProfile').split(' ')[0]}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleDelete(countdown.id)
                                                        }}
                                                        className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-[var(--m-danger-text)] hover:bg-[color-mix(in_srgb,var(--m-danger)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--m-danger)_12%,transparent)] transition-colors"
                                                    >
                                                        {t('settings.delete')}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="m-footnote text-ink-2 mt-1">
                                    {target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className="text-ink">{countdown.event_name}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <button
                onClick={() => {
                    if (userPlan === 'free' && countdowns.length >= FREE_TIER_LIMITS.countdowns) {
                        router.push('/paywall')
                        return
                    }
                    router.push('/focus/countdown/new')
                }}
                className="m-add-row m-press mt-2"
            >
                <Plus size={18} strokeWidth={1.75} aria-hidden />
                {t('focus.addnew')}
            </button>
        </section>
    )
}
