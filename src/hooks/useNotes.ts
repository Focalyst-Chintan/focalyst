import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Note } from '@/types'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'

export function useNotes(userId: string | undefined) {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const supabase = createClient()

    const fetchNotes = useCallback(async (page = 1, limit = 20, folderFilter?: string | null, favouriteFilter?: boolean, timeFilter?: boolean, noteTypeFilter?: string[]) => {
        if (!userId) return

        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('notes')
                .select('id, user_id, title, content, is_favourite, is_pinned, folder, note_type, transcript, audio_url, duration_seconds, created_at, updated_at', { count: 'exact' })
                .eq('user_id', userId)

            if (folderFilter !== undefined) {
                if (folderFilter === null) {
                    query = query.is('folder', null)
                } else {
                    query = query.eq('folder', folderFilter)
                }
            }

            if (favouriteFilter) {
                query = query.eq('is_favourite', true)
            }

            if (noteTypeFilter && noteTypeFilter.length > 0) {
                query = query.in('note_type', noteTypeFilter)
            } else if (noteTypeFilter) {
                query = query.is('note_type', null)
            }

            if (timeFilter) {
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                query = query.gte('updated_at', thirtyDaysAgo.toISOString())
                query = query.order('updated_at', { ascending: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            const from = (page - 1) * limit
            const to = from + limit - 1

            let { data, error: fetchError, count } = await query.range(from, to)

            // If error is due to optional columns (like is_pinned), retry with core columns
            if (fetchError && fetchError.message?.toLowerCase().includes('column')) {
                const fallbackQuery = supabase
                    .from('notes')
                    .select('id, user_id, title, content, is_favourite, folder, note_type, transcript, created_at, updated_at', { count: 'exact' })
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                const res = await fallbackQuery.range(from, to)
                data = res.data
                fetchError = res.error
                count = res.count
            }

            if (fetchError) throw fetchError

            const sortPinned = (list: Note[]) => {
                return [...list].sort((a, b) => {
                    if (a.is_pinned && !b.is_pinned) return -1
                    if (!a.is_pinned && b.is_pinned) return 1
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
            }

            const incoming = (data || []) as Note[]
            if (page === 1) {
                setNotes(sortPinned(incoming))
            } else {
                setNotes((prev) => sortPinned([...prev, ...incoming]))
            }

            setHasMore(count ? from + incoming.length < count : false)
        } catch (err: any) {
            console.error('Supabase error:', err?.message, err?.details, err?.hint)
            setError('Couldn\'t load notes. Try again.')
        } finally {
            setLoading(false)
        }
    }, [userId, supabase])

    const fetchNoteById = useCallback(async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Note
        } catch (err: any) {
            console.error('Supabase error:', err?.message, err?.details, err?.hint)
            return null
        }
    }, [supabase])


    const createNote = useCallback(async (title: string = 'Untitled document', content: string = '') => {
        if (!userId) return null
        try {
            const { data: profile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', userId)
                .single()

            if (profile?.plan === 'free') {
                const { count } = await supabase
                    .from('notes')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)

                if (count !== null && count >= FREE_TIER_LIMITS.notes) {
                    return null
                }
            }

            const { data, error } = await supabase
                .from('notes')
                .insert({
                    user_id: userId,
                    title,
                    content,
                })
                .select()
                .single()

            if (error) throw error

            setNotes((prev) => [data as Note, ...prev])
            return data as Note
        } catch (err: any) {
            console.error('Supabase error:', err?.message, err?.details, err?.hint)
            return null
        }
    }, [userId, supabase])

    const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
        setNotes((currentNotes) => {
            const previousNote = currentNotes.find(n => n.id === id)
            if (!previousNote) return currentNotes;

            return currentNotes.map((note) => note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note)
        });

        try {
            // Validate inputs
            if (updates.title && updates.title.length > 200) {
                throw new Error('Title too long')
            }

            const { data, error } = await supabase
                .from('notes')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            setNotes((prev) => prev.map((note) => note.id === id ? { ...note, ...data } : note))
            return data as Note
        } catch (err: any) {
            console.error('Supabase error:', err?.message, err?.details, err?.hint)

            // Revert optimistic update by re-fetching or simply letting the component handle failures
            // For robust revert, we will re-fetch this note specifically
            fetchNoteById(id).then(serverNote => {
                if (serverNote) {
                    setNotes((prev) => prev.map((note) => note.id === id ? serverNote : note))
                }
            })

            throw err // Re-throw to handle in component (e.g., auto-save failure)
        }
    }, [supabase, fetchNoteById])

    const deleteNote = useCallback(async (id: string) => {
        if (!userId) {
            console.error('Delete failed: No userId provided to hook');
            return false
        }


        // Optimistic update
        setNotes((prev) => prev.filter((note) => note.id !== id))

        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id);

            if (error) {
                // Revert on error
                const { data } = await supabase.from('notes').select('*').eq('id', id).single();
                if (data) {
                    setNotes((prev) => [...prev, data as Note])
                }
                throw error
            }

            return true
        } catch (err: any) {
            console.error('Supabase delete error:', err?.message, err?.details, err?.hint)
            return false
        }
    }, [userId, supabase])

    const toggleFavourite = useCallback(async (id: string, currentStatus: boolean) => {
        // optimistic update
        setNotes((prev) => prev.map((note) => note.id === id ? { ...note, is_favourite: !currentStatus } : note))
        try {
            await updateNote(id, { is_favourite: !currentStatus })
        } catch (e) {
            // revert on failure
            setNotes((prev) => prev.map((note) => note.id === id ? { ...note, is_favourite: currentStatus } : note))
        }
    }, [updateNote])

    const togglePin = useCallback(async (id: string, currentPinned?: boolean) => {
        const nextPinned = !currentPinned
        setNotes((prev) => {
            const updated = prev.map((note) => note.id === id ? { ...note, is_pinned: nextPinned } : note)
            return [...updated].sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1
                if (!a.is_pinned && b.is_pinned) return 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
        })
        try {
            await supabase.from('notes').update({ is_pinned: nextPinned }).eq('id', id)
        } catch (e) {
            console.error('Failed to update pin in supabase:', e)
        }
    }, [supabase])

    return {
        notes,
        loading,
        error,
        hasMore,
        fetchNotes,
        fetchNoteById,
        createNote,
        updateNote,
        deleteNote,
        toggleFavourite,
        togglePin,
    }
}
