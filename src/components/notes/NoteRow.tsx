'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Note } from '@/types'
import { NotesTabIcon } from '@/components/icons/NotesTabIcon'
import { NoteOptionsMenu } from './NoteOptionsMenu'
import { Pin } from 'lucide-react'

interface NoteRowProps {
    note: Note
    onEdit: (note: Note) => void
    onToggleFavourite: (note: Note) => void
    onTogglePin?: (note: Note) => void
    onAddToFolder: (note: Note) => void
    onDownload: (note: Note) => void
    onDelete: (note: Note) => void
}

export const NoteRow = ({
    note,
    onEdit,
    onToggleFavourite,
    onTogglePin,
    onAddToFolder,
    onDownload,
    onDelete
}: NoteRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const { t } = useTranslation()

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            await onDownload(note)
        } finally {
            setIsDownloading(false)
        }
    }

    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return '0 min'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m} min`
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    }

    const titleDisplay = note.title && note.title.trim() !== ''
        ? <span className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{note.title}</span>
        : <span className="text-[15px] italic text-slate-400 truncate">{t('notes.untitled')}</span>

    return (
        <div className="relative">
            <div
                onClick={() => onEdit(note)}
                className="flex items-center justify-between p-4 bg-white dark:bg-[#151B2E] rounded-2xl shadow-sm border border-slate-200 dark:border-[#222A41] hover:border-[#2B6BFF]/30 dark:hover:border-slate-700 transition-all cursor-pointer mb-2.5"
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <div className="shrink-0 flex items-center justify-center">
                        {note.note_type === 'voice' ? (
                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center text-[#FF6B00]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-[#2B6BFF]">
                                <NotesTabIcon size={18} color="currentColor" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col overflow-hidden min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {titleDisplay}
                            {note.is_pinned && (
                                <Pin className="w-3.5 h-3.5 text-[#FF6B00] fill-[#FF6B00] shrink-0" />
                            )}
                        </div>
                        {note.folder && note.note_type !== 'voice' && (
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 block truncate">
                                {note.folder}
                            </span>
                        )}
                        {note.note_type === 'voice' && (
                            <span className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 block truncate">
                                {formatTime(note.created_at)} • {formatDuration(note.duration_seconds)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right Actions: Pin & Three-dot menu */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {onTogglePin && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTogglePin(note)
                            }}
                            className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] transition-colors ${
                                note.is_pinned ? 'text-[#FF6B00]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        >
                            <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-[#FF6B00]' : ''}`} />
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsMenuOpen(true)
                        }}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#0B1021] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label="Note options"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="6" r="2" fill="currentColor" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                            <circle cx="12" cy="18" r="2" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>

            <NoteOptionsMenu
                note={note}
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onEdit={() => onEdit(note)}
                onToggleFavourite={() => onToggleFavourite(note)}
                onAddToFolder={() => onAddToFolder(note)}
                onDownload={handleDownload}
                onDelete={() => onDelete(note)}
                isDownloading={isDownloading}
            />
        </div>
    )
}
