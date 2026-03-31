'use client'

import { Note } from '@/types'

interface NoteOptionsMenuProps {
    note: Note;
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onToggleFavourite: () => void;
    onAddToFolder: () => void;
    onDownload: () => void;
    onDelete: () => void;
    isDownloading?: boolean;
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
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={onClose}
            />

            {/* 
        Bottom sheet for mobile using fixed positioning, 
        or absolute dropdown for desktop depending on responsive rules. 
        Applying mobile-first bottom sheet style as requested 
      */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pb-8 pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:absolute md:bottom-auto md:top-full md:right-0 md:left-auto md:w-64 md:rounded-xl md:shadow-xl md:p-2 md:mt-2">
                {/* Drag handle pill */}
                <div className="w-12 h-1.5 bg-card-bg rounded-full mx-auto mb-4 md:hidden" />

                <div className="flex flex-col">
                    <button onClick={() => { onEdit(); onClose(); }} className="flex items-center p-4 md:py-3 md:px-4 border-b border-card-bg md:border-none md:rounded-lg md:hover:bg-page-bg text-left">
                        <span className="text-[15px] font-medium text-navy">Edit</span>
                    </button>

                    <button onClick={() => { onToggleFavourite(); onClose(); }} className="flex items-center p-4 md:py-3 md:px-4 border-b border-card-bg md:border-none md:rounded-lg md:hover:bg-page-bg text-left">
                        <span className="text-[15px] font-medium text-navy">
                            {note.is_favourite ? 'Remove from Favourites' : 'Add to Favourites'}
                        </span>
                    </button>

                    <button onClick={() => { onAddToFolder(); onClose(); }} className="flex items-center p-4 md:py-3 md:px-4 border-b border-card-bg md:border-none md:rounded-lg md:hover:bg-page-bg text-left">
                        <span className="text-[15px] font-medium text-navy">
                            {note.folder ? `Move folder (${note.folder})` : 'Add to Folder'}
                        </span>
                    </button>

                    <button
                        onClick={() => { onDownload(); }}
                        disabled={isDownloading}
                        className="flex items-center justify-between p-4 md:py-3 md:px-4 border-b border-card-bg md:border-none md:rounded-lg md:hover:bg-page-bg text-left disabled:opacity-70"
                    >
                        <span className="text-[15px] font-medium text-navy">Download as PDF</span>
                        {isDownloading && (
                            <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin ml-2" />
                        )}
                    </button>

                    <button onClick={() => { onDelete(); onClose(); }} className="flex items-center p-4 md:py-3 md:px-4 text-left md:rounded-lg md:hover:bg-red-50">
                        <span className="text-[15px] font-medium text-red-600">Delete</span>
                    </button>
                </div>
            </div>
        </>
    )
}
