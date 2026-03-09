'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

import { Countdown } from '@/types'

export default function CountdownSection({ userId, userPlan }: { userPlan: string, userId: string }) {
    const router = useRouter()
    const supabase = createClient()

    const [countdowns, setCountdowns] = useState<Countdown[]>([])
    const [loading, setLoading] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    useEffect(() => {
        const fetchCountdowns = async () => {
            const { data } = await supabase
                .from('countdowns')
                .select('*')
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
            <h2 className="text-[20px] font-bold text-navy mb-4">Countdown</h2>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-card-bg/50 rounded-xl"></div>
                </div>
            ) : (
                <div className="space-y-4 relative">
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
                            <div key={countdown.id} className="bg-card-bg/50 rounded-xl p-4 flex flex-col border border-card-border relative" style={{ zIndex }}>
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[40px] leading-none font-medium text-navy tracking-tight">{daysRemaining}</span>
                                        <span className="text-navy text-[18px] font-medium tracking-tight">Days to</span>
                                    </div>

                                    {/* Three dots menu */}
                                    <div className="relative z-50">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setOpenMenuId(openMenuId === countdown.id ? null : countdown.id)
                                            }}
                                            className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center rounded-full active:bg-card-border/50 text-navy transition-colors"
                                            aria-label="Options"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none">
                                                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                                            </svg>
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
                                                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-card-border py-2 z-[999]">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            router.push(`/focus/countdown/${countdown.id}`)
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-navy hover:bg-page-bg transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleDelete(countdown.id)
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-error hover:bg-error-light transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-[11px] font-medium text-navy mt-1">
                                    {target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {countdown.event_name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <button
                onClick={() => router.push('/focus/countdown/new')}
                className="w-full mt-4 bg-accent text-white text-sm font-semibold py-3.5 rounded-xl transition-transform active:scale-95 shadow-sm"
            >
                +Add new
            </button>
        </section>
    )
}
