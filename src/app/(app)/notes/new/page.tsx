'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import dynamic from 'next/dynamic'
import { Note } from '@/types'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'

const NoteEditor = dynamic(
    () => import('@/components/notes/NoteEditor').then(mod => mod.NoteEditor),
    { 
        ssr: false, 
        loading: () => (
            <div className="flex items-center justify-center min-h-screen bg-[#F4F7FA] dark:bg-[#0B1021]">
                <div className="w-8 h-8 rounded-full border-2 border-[#2B6BFF] border-t-transparent animate-spin" />
            </div>
        )
    }
)

export default function NewNotePage() {
    const router = useRouter()
    const supabase = createClient()
    const { user, isLoading: authLoading } = useAuth()

    const [note, setNote] = useState<Note | null>(null)
    const [userId, setUserId] = useState<string>('')
    const [userPlan, setUserPlan] = useState<string>('free')
    const [loading, setLoading] = useState(true)
    const [createError, setCreateError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading || !user) return

        async function initNote() {
            if (!user) return
            setLoading(true)
            setCreateError(null)
            setUserId(user.id)

            try {
                // Guard: verify the session is still active before any DB write.
                // On iOS Capacitor the native bridge may clear cookies; if the session
                // is genuinely gone we redirect to login, but NOT on a DB error.
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                if (sessionError || !session) {
                    console.error('[NewNote] Session missing before note insert:', sessionError)
                    router.push('/login')
                    return
                }

                // Fetch plan and current note usage before creating the DB row.
                const { data: profile } = await supabase
                    .from('users')
                    .select('plan')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserPlan(profile.plan)
                }

                if (profile?.plan === 'free') {
                    const { count } = await supabase
                        .from('notes')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id)

                    if (count !== null && count >= FREE_TIER_LIMITS.notes) {
                        router.push('/paywall')
                        return
                    }
                }

                // Create empty note in DB to get an ID for auto-save
                const { data, error } = await supabase
                    .from('notes')
                    .insert({
                        user_id: session.user.id,
                        title: '',
                        content: '',
                    })
                    .select()
                    .single()

                if (error) {
                    // Show an inline error — do NOT redirect to /notes on a DB failure,
                    // as that would look like being kicked to the login page.
                    console.error('[NewNote] Error creating note:', error)
                    setCreateError(`Could not create note: ${error.message}`)
                } else {
                    setNote(data as Note)
                }
            } catch (err: any) {
                console.error('[NewNote] Unexpected error in initNote:', err)
                setCreateError(err?.message || 'An unexpected error occurred. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        initNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
                <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            </div>
        )
    }

    // Inline error screen — user stays on this page and can navigate back manually
    if (createError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950 px-6 gap-4">
                <p className="text-red-500 text-center text-sm font-medium">{createError}</p>
                <button
                    onClick={() => router.push('/notes')}
                    className="px-6 py-2 bg-navy text-white rounded-xl text-sm font-semibold"
                >
                    Back to Notes
                </button>
            </div>
        )
    }

    if (!note) return null

    return <NoteEditor initialNote={note} userId={userId} userPlan={userPlan} />
}
