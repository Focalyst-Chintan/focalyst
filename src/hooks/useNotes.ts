import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Note } from '@/types'

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
                .select('id, user_id, title, content, is_favourite, folder, created_at, updated_at', { count: 'exact' })
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
                // if passed an empty array, it means we want types that are null or not set
                // Supabase `.in` with empty array returns nothing, so we filter for null
                query = query.is('note_type', null)
            }

            if (timeFilter) {
                // Last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                query = query.gte('updated_at', thirtyDaysAgo.toISOString())
                query = query.order('updated_at', { ascending: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            const from = (page - 1) * limit
            const to = from + limit - 1

            const { data, error: fetchError, count } = await query.range(from, to)

            if (fetchError) throw fetchError

            if (page === 1) {
                setNotes(data as Note[])
            } else {
                setNotes((prev) => [...prev, ...(data as Note[])])
            }

            setHasMore(count ? from + data.length < count : false)
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

        console.log('Attempting to delete note:', id, 'for user:', userId);
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
            console.log('Delete successful in Supabase');
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
        toggleFavourite
    }
}
