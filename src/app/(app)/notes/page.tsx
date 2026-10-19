'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase'
import { NotesList, FilterType } from '@/components/notes/NotesList'
import dynamic from 'next/dynamic'
import { FREE_TIER_LIMITS, isPaidPlan } from '@/lib/featureGates'

const VoiceRecordingOverlay = dynamic(
    () => import('@/components/notes/VoiceRecordingOverlay').then(mod => mod.VoiceRecordingOverlay),
    { ssr: false }
)

const FILTERS: FilterType[] = ['All', 'Notes', 'Favourite', 'Folders', 'Voice notes']

export default function NotesPage() {
    const router = useRouter()
    const supabase = createClient()
    const { t } = useTranslation()

    const [userId, setUserId] = useState<string | undefined>()
    const [userPlan, setUserPlan] = useState<string>('free')

    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<FilterType>('All')

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

    return (
        <div className="min-h-screen bg-page-bg dark:bg-slate-950 pb-32 transition-colors">
            {/* Search Bar */}
            <div className="px-4 py-3">
                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-muted dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="search"
                        placeholder={t('notes.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card-bg dark:bg-slate-900 border border-transparent dark:border-slate-800 text-[15px] text-navy dark:text-slate-100 placeholder:text-blue-muted dark:placeholder:text-slate-500 rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                </div>
            </div>

            {/* Filter Chips - horizontally scrollable without scrollbar */}
            <div className="flex overflow-x-auto px-4 pb-4 gap-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                            className={`shrink-0 px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${activeFilter === filter
                                ? 'bg-navy text-white dark:bg-slate-100 dark:text-slate-950'
                                : 'bg-card-bg text-navy dark:bg-slate-900 dark:text-slate-200 hover:bg-card-bg/80 dark:hover:bg-slate-800'
                                }`}
                        >
                            {filterLabels[filter] || filter}
                        </button>
                    )
                })}
            </div>

            {/* Action Row */}
            <div className="px-4">
                <div className="flex items-center gap-3 w-full my-4">
                    <button
                        onClick={handleNewNote}
                        className="flex-1 bg-accent text-white flex items-center justify-center py-3 rounded-xl font-semibold text-[16px] shadow-sm transition-transform active:scale-[0.98]"
                    >
                        {isLocked && (
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                        {t('notes.newNote')}
                    </button>
                    <button 
                        onClick={() => {
                            if (isLocked) router.push('/paywall');
                            else setIsVoiceRecordingOpen(true);
                        }}
                        disabled={isProcessingVoice}
                        className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-70"
                        aria-label="Create Voice Note"
                    >
                        {isProcessingVoice ? (
                            <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            /* iOS WebKit: lucide-react SVGs can be invisible if only 'size' prop is set.
                               Use an inline SVG with explicit width/height attributes to guarantee rendering. */
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
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
            <div className="px-4">
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
