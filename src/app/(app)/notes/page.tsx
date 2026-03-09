'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { NotesList, FilterType } from '@/components/notes/NotesList'
import { UpgradeModal } from '@/components/notes/UpgradeModal'
import { VoiceRecordingOverlay } from '@/components/notes/VoiceRecordingOverlay'

const FILTERS: FilterType[] = ['All', 'Notes', 'Favourite', 'Folders', 'Voice notes']

export default function NotesPage() {
    const router = useRouter()
    const supabase = createClient()

    const [userId, setUserId] = useState<string | undefined>()
    const [userPlan, setUserPlan] = useState<string>('free')

    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<FilterType>('All')

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
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

    const isPaidUser = ['pro_monthly', 'pro_yearly', 'lifetime'].includes(userPlan)
    const isLocked = !isPaidUser && notesCount >= 5

    const handleNewNote = () => {
        if (isLocked) {
            setIsUpgradeModalOpen(true)
        } else {
            router.push('/notes/new')
        }
    }

    const handleVoiceRecordingComplete = async (transcript: string, durationSeconds: number) => {
        setIsVoiceRecordingOpen(false)
        if (isLocked) {
            setIsUpgradeModalOpen(true)
            return
        }
        setIsProcessingVoice(true)
        try {
            const res = await fetch('/api/ai/summarize-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, durationSeconds })
            })
            if (res.ok) {
                // Refresh list or just navigate slightly later
                window.location.reload()
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
        <div className="min-h-screen bg-page-bg pb-20">
            {/* Search Bar */}
            <div className="px-4 py-3">
                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Search your note"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card-bg text-[15px] text-navy placeholder:text-blue-muted rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                </div>
            </div>

            {/* Filter Chips - horizontally scrollable without scrollbar */}
            <div className="flex overflow-x-auto px-4 pb-4 gap-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {FILTERS.map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`shrink-0 px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${activeFilter === filter
                            ? 'bg-navy text-white'
                            : 'bg-card-bg text-navy hover:bg-card-bg/80'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* + New Note Button */}
            <div className="px-4 mb-2">
                <button
                    onClick={handleNewNote}
                    className="w-full bg-accent text-white flex items-center justify-center py-3 rounded-xl font-semibold text-[16px] shadow-sm transition-transform active:scale-[0.98]"
                >
                    {isLocked && (
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                    + New note
                </button>
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

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                title="You've reached your free limit"
                description="Free plan supports up to 5 notes. Upgrade to Pro for unlimited notes."
                onDismiss={() => setIsUpgradeModalOpen(false)}
            />

            {/* Voice Notes FAB */}
            <div className="fixed bottom-24 left-4 right-4 z-40">
                <button
                    onClick={() => {
                        if (isLocked) setIsUpgradeModalOpen(true);
                        else setIsVoiceRecordingOpen(true);
                    }}
                    disabled={isProcessingVoice}
                    className="w-full bg-navy text-white flex items-center justify-center py-4 rounded-xl font-semibold text-[16px] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70"
                >
                    {isProcessingVoice ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    ) : (
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )}
                    {isProcessingVoice ? "Processing..." : "Capture Voice Notes"}
                </button>
            </div>

            <VoiceRecordingOverlay
                isOpen={isVoiceRecordingOpen}
                onClose={() => setIsVoiceRecordingOpen(false)}
                onRecordingComplete={handleVoiceRecordingComplete}
            />
        </div>
    )
}
