'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { Note } from '@/types'

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

export default function EditNotePage() {
    const router = useRouter()
    const supabase = createClient()
    const searchParams = useSearchParams()
    const noteId = searchParams.get('id') as string

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
                .select('id, user_id, title, content, is_favourite, is_pinned, folder, note_type, transcript, audio_url, duration_seconds, created_at, updated_at')
                .eq('id', noteId)
                .eq('user_id', user.id)
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
    }, [supabase, router, noteId])

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
