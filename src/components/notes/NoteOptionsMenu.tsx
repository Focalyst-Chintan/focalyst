'use client'

import { Note } from '@/types'

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
    if (!isOpen) return null

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                onClick={onClose}
            />

            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#151B2E] border-t border-slate-200 dark:border-[#222A41] rounded-t-3xl px-4 pb-8 pt-3 shadow-2xl md:absolute md:bottom-auto md:top-full md:right-0 md:left-auto md:w-64 md:rounded-2xl md:shadow-xl md:p-2 md:mt-2 md:border">
                {/* Drag handle pill */}
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 md:hidden" />

                <div className="flex flex-col">
                    <button
                        onClick={() => { onEdit(); onClose() }}
                        className="flex items-center p-3.5 md:py-2.5 md:px-3 border-b border-slate-100 dark:border-[#222A41] md:border-none md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#0B1021] text-left transition-colors"
                    >
                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">Edit</span>
                    </button>

                    <button
                        onClick={() => { onToggleFavourite(); onClose() }}
                        className="flex items-center p-3.5 md:py-2.5 md:px-3 border-b border-slate-100 dark:border-[#222A41] md:border-none md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#0B1021] text-left transition-colors"
                    >
                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {note.is_favourite ? 'Remove from Favourites' : 'Add to Favourites'}
                        </span>
                    </button>

                    <button
                        onClick={() => { onAddToFolder(); onClose() }}
                        className="flex items-center p-3.5 md:py-2.5 md:px-3 border-b border-slate-100 dark:border-[#222A41] md:border-none md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#0B1021] text-left transition-colors"
                    >
                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {note.folder ? `Move folder (${note.folder})` : 'Add to Folder'}
                        </span>
                    </button>

                    <button
                        onClick={() => { onDownload() }}
                        disabled={isDownloading}
                        className="flex items-center justify-between p-3.5 md:py-2.5 md:px-3 border-b border-slate-100 dark:border-[#222A41] md:border-none md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#0B1021] text-left disabled:opacity-70 transition-colors"
                    >
                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">Download as PDF</span>
                        {isDownloading && (
                            <div className="w-4 h-4 border-2 border-[#2B6BFF] border-t-transparent rounded-full animate-spin ml-2" />
                        )}
                    </button>

                    <button
                        onClick={() => { onDelete(); onClose() }}
                        className="flex items-center p-3.5 md:py-2.5 md:px-3 text-left md:rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 font-semibold text-[14px] transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </>
    )
}
