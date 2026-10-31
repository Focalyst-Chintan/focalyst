'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Note } from '@/types'
import { NoteOptionsMenu } from './NoteOptionsMenu'
import { FileText, Mic, MoreHorizontal, Pin } from 'lucide-react'

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

    // Display only: plain-text preview and a short meta line
    const preview = (note.content || '').replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    const updated = new Date(note.updated_at || note.created_at)
    const isTodayNote = updated.toDateString() === new Date().toDateString()
    const when = isTodayNote ? formatTime(note.updated_at || note.created_at) : updated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const isVoice = note.note_type === 'voice'

    const titleDisplay = note.title && note.title.trim() !== ''
        ? <span className="m-headline text-ink truncate">{note.title}</span>
        : <span className="m-headline text-ink-2 truncate">{t('notes.untitled')}</span>

    return (
        <div className="relative mb-2">
            <div
                onClick={() => onEdit(note)}
                className="m-glass m-glass-md m-press flex items-start gap-3 pl-4 pr-1 py-3.5 cursor-pointer"
            >
                <span className={`m-tile !w-9 !h-9 mt-0.5 ${isVoice ? 'm-tile-info' : 'text-ink-2'}`} aria-hidden>
                    {isVoice ? <Mic size={18} strokeWidth={1.75} /> : <FileText size={18} strokeWidth={1.75} />}
                </span>

                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {titleDisplay}
                    </div>
                    {preview && !isVoice && (
                        <p className="m-footnote text-ink-2 m-clamp-2 mt-0.5 break-words">{preview}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap m-caption text-ink-2">
                        <span className="m-num">{when}</span>
                        {note.folder && (
                            <>
                                <span aria-hidden>·</span>
                                <span className="truncate max-w-[140px]">{note.folder}</span>
                            </>
                        )}
                        {isVoice && (
                            <span className="m-chip m-chip-info !h-6 !text-[12px] ml-0.5">{formatDuration(note.duration_seconds)}</span>
                        )}
                    </div>
                </div>

                {/* Right Actions: Pin & Three-dot menu */}
                <div className="flex items-center shrink-0 -my-1.5">
                    {onTogglePin && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTogglePin(note)
                            }}
                            className={`m-press w-11 h-11 rounded-full flex items-center justify-center ${
                                note.is_pinned ? 'text-primary-text' : 'text-ink-2'
                            }`}
                            aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                            aria-pressed={!!note.is_pinned}
                            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        >
                            <Pin size={18} strokeWidth={1.75} className={note.is_pinned ? 'fill-current' : ''} aria-hidden />
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsMenuOpen(true)
                        }}
                        className="m-press w-11 h-11 rounded-full flex items-center justify-center text-ink-2"
                        aria-label={`More options for ${note.title || t('notes.untitled')}`}
                    >
                        <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden />
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
