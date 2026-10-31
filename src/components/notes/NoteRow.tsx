'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Note } from '@/types'
import { NoteOptionsMenu } from './NoteOptionsMenu'
import { Mic, MoreHorizontal, NotebookPen, Pin } from 'lucide-react'

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

    const isVoice = note.note_type === 'voice'

    const titleDisplay = note.title && note.title.trim() !== ''
        ? <span className="m-callout !font-semibold text-ink truncate">{note.title}</span>
        : <span className="m-callout text-ink-2 truncate">{t('notes.untitled')}</span>

    return (
        <div className="relative mb-2">
            <div
                onClick={() => onEdit(note)}
                className="m-glass m-glass-md m-press flex items-center justify-between gap-3 pl-4 pr-1 py-3 cursor-pointer"
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <span className={`m-tile !w-9 !h-9 ${isVoice ? 'm-tile-info' : 'text-primary-text'}`} aria-hidden>
                        {isVoice ? <Mic size={18} strokeWidth={1.75} /> : <NotebookPen size={18} strokeWidth={1.75} />}
                    </span>

                    <div className="flex flex-col overflow-hidden min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {titleDisplay}
                            {note.is_pinned && (
                                <Pin className="w-3.5 h-3.5 text-primary-text fill-current shrink-0" aria-label="Pinned" />
                            )}
                        </div>
                        {note.folder && !isVoice && (
                            <span className="m-overline text-ink-2 mt-0.5 block truncate">
                                {note.folder}
                            </span>
                        )}
                        {isVoice && (
                            <span className="m-caption text-ink-2 mt-0.5 block truncate m-num">
                                {formatTime(note.created_at)} · {formatDuration(note.duration_seconds)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right Actions: Pin & Three-dot menu */}
                <div className="flex items-center shrink-0 -my-1.5 ml-1">
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
