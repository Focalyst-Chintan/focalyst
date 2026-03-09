'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { Note } from '@/types'

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [note, setNote] = useState<Note | null>(null)
    const [userId, setUserId] = useState<string>('')
    const [userPlan, setUserPlan] = useState<string>('free')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadNote() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            setUserId(user.id)

            // Fetch plan
            const { data: profile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', user.id)
                .single()

            if (profile) {
                setUserPlan(profile.plan)
            }

            // Fetch note
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', resolvedParams.id)
                .single()

            if (error || !data) {
                console.error("Error loading note:", error)
                setError("Note not found or you don't have access.")
            } else {
                setNote(data as Note)
            }
            setLoading(false)
        }

        loadNote()
    }, [supabase, router, resolvedParams.id])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            </div>
        )
    }

    if (error || !note) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
                <p className="text-navy font-semibold mb-4">{error}</p>
                <button
                    onClick={() => router.push('/notes')}
                    className="px-6 py-2 bg-navy text-white rounded-full font-semibold"
                >
                    Back to Notes
                </button>
            </div>
        )
    }

    return <NoteEditor initialNote={note} userId={userId} userPlan={userPlan} />
}
