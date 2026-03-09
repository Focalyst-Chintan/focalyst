'use client'

import { useState } from 'react'
import { Note } from '@/types'
import { NoteRow } from './NoteRow'

interface FolderGroupProps {
    folderName: string;
    notes: Note[];
    onEdit: (note: Note) => void;
    onToggleFavourite: (note: Note) => void;
    onAddToFolder: (note: Note) => void;
    onDownload: (note: Note) => void;
    onDelete: (note: Note) => void;
}

export const FolderGroup = ({
    folderName,
    notes,
    onEdit,
    onToggleFavourite,
    onAddToFolder,
    onDownload,
    onDelete
}: FolderGroupProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (notes.length === 0) return null;

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center w-full py-2 mb-2 group"
            >
                <div className="text-blue-muted mr-2 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span className="text-[13px] font-semibold text-blue-muted uppercase tracking-wider group-hover:text-navy transition-colors">
                    {folderName}
                </span>
                <span className="ml-2 text-xs text-blue-muted/60 bg-card-bg px-2 rounded-full">
                    {notes.length}
                </span>
            </button>

            {isExpanded && (
                <div className="pl-2">
                    {notes.map(note => (
                        <NoteRow
                            key={note.id}
                            note={note}
                            onEdit={onEdit}
                            onToggleFavourite={onToggleFavourite}
                            onAddToFolder={onAddToFolder}
                            onDownload={onDownload}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
