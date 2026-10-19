'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PomodoroSection from '@/components/focus/PomodoroSection'
import CountdownSection from '@/components/focus/CountdownSection'
import BlockerCard from '@/components/focus/BlockerCard'

export default function FocusPage() {
    const supabase = createClient()
    const { user } = useAuth()

    const [userPlan, setUserPlan] = useState('free')
    const [userId, setUserId] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        async function fetchProfile() {
            if (!user) return
            setUserId(user.id)

            const { data: userProfile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', user.id)
                .single()

            if (userProfile) {
                setUserPlan(userProfile.plan || 'free')
            }
            setLoading(false)
        }
        fetchProfile()
    }, [supabase, user])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-page-bg dark:bg-slate-950">
                <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-24 bg-page-bg dark:bg-slate-950">
            <main className="max-w-md mx-auto p-4 pt-6">
                <PomodoroSection userPlan={userPlan} />

                <div className="my-6">
                    <BlockerCard />
                </div>

                <CountdownSection userPlan={userPlan} userId={userId} />
            </main>
        </div>
    )
}
