'use client'

import { useState } from 'react'
import { Note } from '@/types'
import { NotesTabIcon } from '@/components/icons/NotesTabIcon'
import { NoteOptionsMenu } from './NoteOptionsMenu'

interface NoteRowProps {
    note: Note;
    onEdit: (note: Note) => void;
    onToggleFavourite: (note: Note) => void;
    onAddToFolder: (note: Note) => void;
    onDownload: (note: Note) => void;
    onDelete: (note: Note) => void;
}

export const NoteRow = ({
    note,
    onEdit,
    onToggleFavourite,
    onAddToFolder,
    onDownload,
    onDelete
}: NoteRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await onDownload(note);
        } finally {
            setIsDownloading(false);
        }
    };

    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return '0 min';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    }

    const titleDisplay = note.title && note.title.trim() !== ''
        ? <span className="text-[15px] font-semibold text-navy truncate">{note.title}</span>
        : <span className="text-[15px] italic text-blue-muted truncate">Untitled document</span>;

    return (
        <div className="relative">
            <div
                onClick={() => onEdit(note)}
                className="flex items-center justify-between p-4 bg-white rounded-xl shadow-[0_2px_8px_rgba(74,108,140,0.06)] border border-transparent hover:border-card-bg transition-colors cursor-pointer mb-3"
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="shrink-0 flex items-center justify-center">
                        {note.note_type === 'voice' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 10V11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11V10" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 18V22" stroke="#4A6C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            <NotesTabIcon size={20} color="#4A6C8C" />
                        )}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                        {titleDisplay}
                        {note.folder && note.note_type !== 'voice' && (
                            <span className="text-[11px] text-blue-muted uppercase tracking-wider mt-0.5 block truncate">
                                {note.folder}
                            </span>
                        )}
                        {note.note_type === 'voice' && (
                            <span className="text-[12px] text-blue-muted mt-0.5 block truncate">
                                {formatTime(note.created_at)} • {formatDuration(note.duration_seconds)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Three-dot options button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(true);
                    }}
                    className="p-2 shrink-0 rounded-full hover:bg-page-bg ml-2 -mr-2"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="6" r="2" fill="#4A6C8C" />
                        <circle cx="12" cy="12" r="2" fill="#4A6C8C" />
                        <circle cx="12" cy="18" r="2" fill="#4A6C8C" />
                    </svg>
                </button>
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
