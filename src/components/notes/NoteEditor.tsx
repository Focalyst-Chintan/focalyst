'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoSave } from '@/hooks/useAutoSave'
import { generatePdf } from '@/lib/pdf'
import { Note } from '@/types'
import { UpgradeModal } from './UpgradeModal'
import { createClient } from '@/lib/supabase'
import DOMPurify from 'isomorphic-dompurify'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import {
    ChevronLeft,
    Heart,
    Pin,
    Download,
    CheckSquare,
    Bold,
    List,
    Heading2,
    Mic,
    Volume2,
    Copy,
    Check
} from 'lucide-react'

interface NoteEditorProps {
    initialNote: Note
    userId: string
    userPlan: string
}

const MAX_FREE_CHARS = 100000

export const NoteEditor = ({ initialNote, userId, userPlan }: NoteEditorProps) => {
    const router = useRouter()
    const supabase = createClient()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const [note, setNote] = useState<Note>(initialNote)
    const [title, setTitle] = useState(initialNote.title || '')
    const [content, setContent] = useState(initialNote.content || '')
    const [charCount, setCharCount] = useState(0)
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
    const [copiedSummary, setCopiedSummary] = useState(false)
    const [copiedTranscript, setCopiedTranscript] = useState(false)

    const [titleError, setTitleError] = useState('')
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary')

    const isPaidUser = ['pro_monthly', 'pro_yearly', 'lifetime'].includes(userPlan)
    const isVoiceNote = note.note_type === 'voice'

    // AutoSave Hook setup
    const dataToSave = { title, content }

    const saveToSupabase = useCallback(async (data: typeof dataToSave) => {
        if (data.title.length > 200) {
            setTitleError('Title too long')
            throw new Error('Title too long')
        }

        const { error } = await supabase
            .from('notes')
            .update({
                title: data.title,
                content: data.content,
                updated_at: new Date().toISOString()
            })
            .eq('id', note.id)

        if (error) throw error
    }, [note.id, supabase])

    const { status: saveStatus, triggerSave, retrySave } = useAutoSave(saveToSupabase, dataToSave, 3000)

    useEffect(() => {
        setCharCount(content.length)
        if (!isPaidUser && content.length > MAX_FREE_CHARS) {
            setIsUpgradeModalOpen(true)
        }
    }, [content, isPaidUser])

    const handleBack = async () => {
        try {
            const isTitleEmpty = !title.trim() || title === 'Untitled document'
            const isContentEmpty = !content.trim()

            if (isTitleEmpty && isContentEmpty) {
                await supabase.from('notes').delete().eq('id', note.id).eq('user_id', userId)
            } else {
                await saveToSupabase(dataToSave)
            }
        } catch (e) {
            console.error('Save before exit failed:', e)
        }
        router.push('/notes')
    }

    const handleToggleFavourite = async () => {
        const newValue = !note.is_favourite
        setNote(prev => ({ ...prev, is_favourite: newValue }))
        await supabase.from('notes').update({ is_favourite: newValue }).eq('id', note.id)
    }

    const handleTogglePin = async () => {
        const newValue = !note.is_pinned
        setNote(prev => ({ ...prev, is_pinned: newValue }))
        try {
            await supabase.from('notes').update({ is_pinned: newValue }).eq('id', note.id)
        } catch (e) {
            console.error('Failed to toggle pin in editor:', e)
        }
    }

    const handleDownloadPdf = async () => {
        if (isDownloadingPdf) return
        setIsDownloadingPdf(true)
        try {
            const htmlContent = content
                .split('\n')
                .map(paragraph => `<p>${paragraph || '&nbsp;'}</p>`)
                .join('')
            await generatePdf(title || 'Untitled document', htmlContent)
        } catch (err) {
            console.error('PDF generation failed:', err)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsDownloadingPdf(false)
        }
    }

    // Formatting Toolbar Helpers
    const insertChecklist = () => {
        if (!textareaRef.current) return
        const el = textareaRef.current
        const start = el.selectionStart
        const end = el.selectionEnd
        const before = content.substring(0, start)
        const after = content.substring(end)
        const prefix = before.endsWith('\n') || before === '' ? '' : '\n'
        const newText = `${before}${prefix}- [ ] ${after}`
        setContent(newText)
        setTimeout(() => {
            el.focus()
            const pos = start + prefix.length + 6
            el.setSelectionRange(pos, pos)
        }, 10)
    }

    const insertBold = () => {
        if (!textareaRef.current) return
        const el = textareaRef.current
        const start = el.selectionStart
        const end = el.selectionEnd
        const selected = content.substring(start, end)
        const before = content.substring(0, start)
        const after = content.substring(end)
        const insertText = selected ? `**${selected}**` : '**bold text**'
        setContent(`${before}${insertText}${after}`)
        setTimeout(() => {
            el.focus()
            el.setSelectionRange(start + 2, start + insertText.length - 2)
        }, 10)
    }

    const insertBullet = () => {
        if (!textareaRef.current) return
        const el = textareaRef.current
        const start = el.selectionStart
        const end = el.selectionEnd
        const before = content.substring(0, start)
        const after = content.substring(end)
        const prefix = before.endsWith('\n') || before === '' ? '' : '\n'
        setContent(`${before}${prefix}• ${after}`)
        setTimeout(() => {
            el.focus()
            const pos = start + prefix.length + 2
            el.setSelectionRange(pos, pos)
        }, 10)
    }

    const insertHeading = () => {
        if (!textareaRef.current) return
        const el = textareaRef.current
        const start = el.selectionStart
        const end = el.selectionEnd
        const before = content.substring(0, start)
        const after = content.substring(end)
        const prefix = before.endsWith('\n') || before === '' ? '' : '\n'
        setContent(`${before}${prefix}## ${after}`)
        setTimeout(() => {
            el.focus()
            const pos = start + prefix.length + 3
            el.setSelectionRange(pos, pos)
        }, 10)
    }

    // Speech to text integration directly into the textarea
    const { isListening, isSupported, toggleListening } = useSpeechToText((transcript) => {
        setContent(prev => prev + transcript)
    })

    const formatVoiceDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const formatVoiceTime = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    }

    const formatVoiceDuration = (seconds?: number | null) => {
        if (!seconds) return '0 min'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m} min`
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F4F7FA] dark:bg-[#0B1021] text-slate-900 dark:text-white transition-colors duration-200">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#151B2E] border-b border-slate-200 dark:border-[#222A41] sticky top-0 z-30 shadow-xs">
                {/* Back Arrow */}
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B1021] rounded-full transition-colors"
                    aria-label="Back to notes"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Title Input & Save Status */}
                <div className="flex flex-col items-center justify-center flex-1 px-3">
                    <input
                        type="text"
                        value={title || ''}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            if (e.target.value.length <= 200) setTitleError('')
                        }}
                        placeholder="Untitled document"
                        className="w-full text-center text-lg font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 placeholder:font-normal truncate"
                    />
                    {titleError && <p className="text-[11px] text-red-500 mt-0.5">{titleError}</p>}

                    {isVoiceNote && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {formatVoiceDate(note.created_at)} • {formatVoiceTime(note.created_at)} • {formatVoiceDuration(note.duration_seconds)}
                        </p>
                    )}

                    {/* Save Status Indicator */}
                    <div className="h-4 flex items-center justify-center mt-0.5">
                        {saveStatus === 'saving' && <span className="text-[11px] text-slate-400">Saving...</span>}
                        {saveStatus === 'saved' && (
                            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                Saved
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <button onClick={retrySave} className="text-[11px] text-red-500 font-medium hover:underline">
                                Save failed. Tap to retry.
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Action Icons: Pin, Favourite, Download */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleTogglePin}
                        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] transition-colors ${
                            note.is_pinned ? 'text-[#FF6B00]' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                    >
                        <Pin className={`w-5 h-5 ${note.is_pinned ? 'fill-[#FF6B00]' : ''}`} />
                    </button>

                    <button
                        onClick={handleToggleFavourite}
                        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] transition-colors ${
                            note.is_favourite ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={note.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                    >
                        <Heart className={`w-5 h-5 ${note.is_favourite ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>

                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="p-2 -mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400 dark:text-slate-500 disabled:opacity-50 transition-colors"
                        title="Download as PDF"
                    >
                        {isDownloadingPdf ? (
                            <div className="w-5 h-5 border-2 border-[#2B6BFF] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Audio Player Bar for Voice Notes */}
            {note.audio_url && (
                <div className="mx-4 mt-3 p-3 bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center text-[#FF6B00] shrink-0">
                        <Volume2 className="w-4 h-4" />
                    </div>
                    <audio controls src={note.audio_url} className="w-full h-8 outline-none" />
                </div>
            )}

            {/* Voice Toggle Tabs */}
            {isVoiceNote && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#151B2E] border-b border-slate-200 dark:border-[#222A41]">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`h-9 px-4 text-xs font-bold rounded-xl transition-all ${
                                activeTab === 'summary'
                                    ? 'bg-[#2B6BFF] text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0B1021]'
                            }`}
                        >
                            Note Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`h-9 px-4 text-xs font-bold rounded-xl transition-all ${
                                activeTab === 'transcript'
                                    ? 'bg-[#2B6BFF] text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0B1021]'
                            }`}
                        >
                            Transcript
                        </button>
                    </div>

                    {activeTab === 'summary' ? (
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(content)
                                setCopiedSummary(true)
                                setTimeout(() => setCopiedSummary(false), 2000)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#0B1021] text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        >
                            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(note.transcript || '')
                                setCopiedTranscript(true)
                                setTimeout(() => setCopiedTranscript(false), 2000)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#2B6BFF] text-white hover:bg-blue-600 shadow-sm"
                        >
                            {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Sleek Formatting Toolbar (Checklist, Bold, Bullet, Heading) */}
            {!isVoiceNote && (
                <div className="px-4 py-2 bg-white/90 dark:bg-[#151B2E]/90 backdrop-blur-sm border-b border-slate-200 dark:border-[#222A41] flex items-center gap-1.5 sticky top-[65px] z-20">
                    <button
                        type="button"
                        onClick={insertChecklist}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                        title="Add interactive checklist item"
                    >
                        <CheckSquare className="w-4 h-4 text-[#2B6BFF]" />
                        <span>Checklist</span>
                    </button>

                    <button
                        type="button"
                        onClick={insertBold}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-700 dark:text-slate-300 transition-colors"
                        title="Bold text"
                    >
                        <Bold className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={insertBullet}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-700 dark:text-slate-300 transition-colors"
                        title="Bullet list"
                    >
                        <List className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={insertHeading}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-700 dark:text-slate-300 transition-colors"
                        title="Heading"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Editor Textarea Area */}
            <div className={`flex-1 flex flex-col px-5 py-6 pb-32 max-w-3xl w-full mx-auto ${activeTab !== 'summary' ? 'hidden' : ''}`}>
                {isVoiceNote ? (
                    <div
                        className="w-full flex-1 min-h-[60vh] text-slate-900 dark:text-slate-100 prose dark:prose-invert prose-sm sm:prose-base select-text leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '') }}
                    />
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={content || ''}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start typing your note... Use - [ ] for checklists, **bold**, or # headings"
                        disabled={!isPaidUser && charCount >= MAX_FREE_CHARS}
                        className="w-full flex-1 min-h-[65vh] text-slate-900 dark:text-slate-100 bg-transparent outline-none border-none resize-none prose dark:prose-invert prose-sm sm:prose-base focus:ring-0 focus:outline-none p-0 placeholder:text-slate-400 select-text leading-relaxed font-sans"
                    />
                )}
            </div>

            {/* Transcript Area */}
            {isVoiceNote && activeTab === 'transcript' && (
                <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 max-w-3xl w-full mx-auto">
                    <div className="prose dark:prose-invert prose-sm sm:prose-base text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                        {note.transcript}
                    </div>
                </div>
            )}

            {/* Character Counter */}
            {!isPaidUser && (
                <div className="fixed bottom-[56px] right-4 z-30 pointer-events-none">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-md bg-white/80 dark:bg-[#151B2E]/80 backdrop-blur-xs border border-slate-200 dark:border-[#222A41] ${
                        charCount >= MAX_FREE_CHARS ? 'text-red-500 font-bold' : 'text-slate-400'
                    }`}>
                        {charCount.toLocaleString()} / {MAX_FREE_CHARS.toLocaleString()}
                    </span>
                </div>
            )}

            {/* Speech to Text Microphone Floating Bar */}
            {activeTab === 'summary' && isSupported && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#151B2E]/95 backdrop-blur-md rounded-full shadow-xl border border-slate-200 dark:border-[#222A41] flex items-center px-4 py-2 gap-3">
                    {isListening && (
                        <div className="flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            <span className="text-[11px] text-red-600 font-bold tracking-wide uppercase">Listening</span>
                        </div>
                    )}
                    <button
                        onClick={toggleListening}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isListening
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-[#2B6BFF] text-white active:scale-95 shadow-md'
                        }`}
                        title={isListening ? 'Stop Speech Recognition' : 'Speech to Text'}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                title="You've reached your free limit"
                description="Free plan supports up to 100,000 characters per note. Upgrade to Pro for unlimited notes."
                onDismiss={() => setIsUpgradeModalOpen(false)}
            />
        </div>
    )
}
