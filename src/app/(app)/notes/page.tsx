'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase'
import { NotesList, FilterType } from '@/components/notes/NotesList'
import dynamic from 'next/dynamic'
import { FREE_TIER_LIMITS, isPaidPlan } from '@/lib/featureGates'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import DesktopNotesView from '@/components/desktop/notes/DesktopNotesView'
import { Skeleton } from '@/components/desktop/ui/Skeleton'

const VoiceRecordingOverlay = dynamic(
    () => import('@/components/notes/VoiceRecordingOverlay').then(mod => mod.VoiceRecordingOverlay),
    { ssr: false }
)

const FILTERS: FilterType[] = ['All', 'Notes', 'Favourite', 'Folders', 'Voice notes']

import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback'
import { Lock, Plus, Search, X } from 'lucide-react'

export default function NotesPage() {
    const isDesktop = useIsDesktop()
    const router = useRouter()
    const supabase = createClient()
    const { t } = useTranslation()

    const [userId, setUserId] = useState<string | undefined>()
    const [userPlan, setUserPlan] = useState<string>('free')

    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<FilterType>('All')

    const debouncedSearch = useDebouncedCallback((val: string) => {
        setSearchQuery(val)
    }, 200)

    const handleSearchChange = (val: string) => {
        setSearchInput(val)
        debouncedSearch.run(val)
    }

    const [notesCount, setNotesCount] = useState(0)

    const [isVoiceRecordingOpen, setIsVoiceRecordingOpen] = useState(false)
    const [isProcessingVoice, setIsProcessingVoice] = useState(false)

    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
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
            }
        }
        fetchUser()
    }, [supabase])

    const isLocked = !isPaidPlan(userPlan) && notesCount >= FREE_TIER_LIMITS.notes

    const handleNewNote = (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        if (isLocked) {
            router.push('/paywall')
            return
        }
        router.push('/notes/new')
    }

    const handleVoiceRecordingComplete = async (transcript: string, durationSeconds: number) => {
        setIsVoiceRecordingOpen(false)
        if (isLocked) {
            router.push('/paywall')
            return
        }
        setIsProcessingVoice(true)
        try {
            const res = await fetch('/api/ai/summarize-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, durationSeconds })
            })
            if (res.status === 402 || res.status === 403) {
                router.push('/paywall')
            } else if (res.ok) {
                // Refresh list or just navigate slightly later
                router.refresh()
            } else {
                alert("Failed to process voice note.")
            }
        } catch (e) {
            console.error(e)
            alert("Error saving voice note.")
        } finally {
            setIsProcessingVoice(false)
        }
    }

    if (isDesktop === null) {
        return (
            <div className="p-6">
                <Skeleton className="h-[calc(100vh-140px)] w-full rounded-[20px]" />
            </div>
        )
    }

    if (isDesktop) {
        return <DesktopNotesView />
    }

    return (
        <div className="pb-6">
            {/* Search Bar */}
            <div className="px-5 pt-2">
                <label className="m-search">
                    <Search size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />
                    <span className="sr-only">{t('notes.searchPlaceholder')}</span>
                    <input
                        type="search"
                        placeholder={t('notes.searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => handleSearchChange('')}
                            className="m-press w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-ink-2"
                            aria-label="Clear search"
                        >
                            <X size={16} strokeWidth={2} aria-hidden />
                        </button>
                    )}
                </label>
            </div>

            {/* Filter Chips - horizontally scrollable without scrollbar */}
            <div className="flex overflow-x-auto px-5 pt-3 pb-4 gap-2 fx-no-scrollbar" role="group" aria-label="Filter notes">
                {FILTERS.map(filter => {
                    const filterLabels: Record<string, string> = {
                        'All': t('notes.all'),
                        'Notes': t('notes.notes'),
                        'Favourite': t('notes.favourite'),
                        'Folders': t('notes.folders'),
                        'Voice notes': t('notes.voiceNotes')
                    }
                    return (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            aria-pressed={activeFilter === filter}
                            className="m-pill m-press shrink-0"
                        >
                            {filterLabels[filter] || filter}
                        </button>
                    )
                })}
            </div>

            {/* Action Row */}
            <div className="px-5">
                <div className="flex items-center gap-3 w-full">
                    <button
                        onClick={handleNewNote}
                        className="m-btn m-btn-primary m-press flex-1"
                    >
                        {isLocked ? <Lock size={18} strokeWidth={1.75} aria-hidden /> : <Plus size={18} strokeWidth={2} aria-hidden />}
                        {t('notes.newNote')}
                    </button>
                    <button 
                        onClick={() => {
                            if (isLocked) router.push('/paywall');
                            else setIsVoiceRecordingOpen(true);
                        }}
                        disabled={isProcessingVoice}
                        className="m-press flex-shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-full bg-[var(--m-surface-strong)] border border-line-strong text-ink disabled:opacity-70"
                        aria-label="Create Voice Note"
                    >
                        {isProcessingVoice ? (
                            <div className="w-5 h-5 border-2 border-primary-text border-t-transparent rounded-full animate-spin" />
                        ) : (
                            /* iOS WebKit: lucide-react SVGs can be invisible if only 'size' prop is set.
                               Use an inline SVG with explicit width/height attributes to guarantee rendering. */
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ display: 'block', flexShrink: 0 }}
                            >
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Notes List */}
            <div className="px-5">
                <NotesList
                    userId={userId}
                    searchQuery={searchQuery}
                    activeFilter={activeFilter}
                    onNotesCountParsed={setNotesCount}
                />
            </div>

            <VoiceRecordingOverlay
                isOpen={isVoiceRecordingOpen}
                onClose={() => setIsVoiceRecordingOpen(false)}
                onRecordingComplete={handleVoiceRecordingComplete}
            />
        </div>
    )
}
