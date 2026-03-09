'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { Note } from '@/types'

export default function NewNotePage() {
    const router = useRouter()
    const supabase = createClient()

    const [note, setNote] = useState<Note | null>(null)
    const [userId, setUserId] = useState<string>('')
    const [userPlan, setUserPlan] = useState<string>('free')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function initNote() {
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

            // Create empty note in DB right away to get an ID for auto-save
            const { data, error } = await supabase
                .from('notes')
                .insert({
                    user_id: user.id,
                    title: '',
                    content: '',
                })
                .select()
                .single()

            if (error) {
                console.error("Error creating note:", error)
                router.push('/notes')
            } else {
                setNote(data as Note)
            }
            setLoading(false)
        }

        initNote()
    }, [supabase, router])

    if (loading || !note) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            </div>
        )
    }

    return <NoteEditor initialNote={note} userId={userId} userPlan={userPlan} />
}
