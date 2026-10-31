'use client'

import { Note } from '@/types'
import { Download, Folder, Pencil, Star, Trash2 } from 'lucide-react'
import { useBodyScrollLock, useSwipeToClose } from '@/components/mobile/hooks'

interface NoteOptionsMenuProps {
    note: Note
    isOpen: boolean
    onClose: () => void
    onEdit: () => void
    onToggleFavourite: () => void
    onAddToFolder: () => void
    onDownload: () => void
    onDelete: () => void
    isDownloading?: boolean
}

export const NoteOptionsMenu = ({
    note,
    isOpen,
    onClose,
    onEdit,
    onToggleFavourite,
    onAddToFolder,
    onDownload,
    onDelete,
    isDownloading = false
}: NoteOptionsMenuProps) => {
    const swipe = useSwipeToClose(onClose)
    useBodyScrollLock(isOpen)

    if (!isOpen) return null

    const row = 'm-press flex items-center gap-3 min-h-[52px] px-3 md:min-h-11 rounded-[14px] text-left m-callout text-ink hover:bg-[var(--m-surface-strong)] active:bg-[var(--m-surface-strong)] transition-colors disabled:opacity-70'

    return (
        <>
            <div
                className="fixed inset-0 z-[70] m-backdrop md:bg-transparent"
                onClick={onClose}
            />

            <div
                role="menu"
                aria-label="Note options"
                className="m-sheet fixed bottom-0 left-0 right-0 z-[71] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 md:absolute md:bottom-auto md:top-full md:right-0 md:left-auto md:w-64 md:rounded-[16px] md:border md:p-1.5 md:mt-2 md:animate-none"
                style={swipe.style}
            >
                {/* Grabber: drag down to close */}
                <div {...swipe.handlers} className="touch-none flex justify-center pt-1 pb-3 md:hidden">
                    <span aria-hidden className="m-grabber" />
                </div>

                <div className="flex flex-col">
                    <button
                        role="menuitem"
                        onClick={() => { onEdit(); onClose() }}
                        className={row}
                    >
                        <Pencil size={20} strokeWidth={1.75} className="text-ink-2" aria-hidden />
                        <span>Edit</span>
                    </button>

                    <button
                        role="menuitem"
                        onClick={() => { onToggleFavourite(); onClose() }}
                        className={row}
                    >
                        <Star size={20} strokeWidth={1.75} className={note.is_favourite ? 'text-primary-text fill-current' : 'text-ink-2'} aria-hidden />
                        <span>
                            {note.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                        </span>
                    </button>

                    <button
                        role="menuitem"
                        onClick={() => { onAddToFolder(); onClose() }}
                        className={row}
                    >
                        <Folder size={20} strokeWidth={1.75} className="text-ink-2" aria-hidden />
                        <span className="truncate">
                            {note.folder ? `Move from ${note.folder}` : 'Add to folder'}
                        </span>
                    </button>

                    <button
                        role="menuitem"
                        onClick={() => { onDownload() }}
                        disabled={isDownloading}
                        className={row}
                    >
                        <Download size={20} strokeWidth={1.75} className="text-ink-2" aria-hidden />
                        <span className="flex-1">Download as PDF</span>
                        {isDownloading && (
                            <span aria-hidden className="w-4 h-4 border-2 border-primary-text border-t-transparent rounded-full animate-spin" />
                        )}
                    </button>

                    <button
                        role="menuitem"
                        onClick={() => { onDelete(); onClose() }}
                        className={`${row} !text-[var(--m-danger-text)] hover:!bg-[color-mix(in_srgb,var(--m-danger)_12%,transparent)]`}
                    >
                        <Trash2 size={20} strokeWidth={1.75} aria-hidden />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </>
    )
}
