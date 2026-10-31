'use client'

import { useState } from 'react'
import { Note } from '@/types'
import { NoteRow } from './NoteRow'
import { ChevronRight } from 'lucide-react'

interface FolderGroupProps {
    folderName: string;
    notes: Note[];
    onEdit: (note: Note) => void;
    onToggleFavourite: (note: Note) => void;
    onTogglePin?: (note: Note) => void;
    onAddToFolder: (note: Note) => void;
    onDownload: (note: Note) => void;
    onDelete: (note: Note) => void;
}

export const FolderGroup = ({
    folderName,
    notes,
    onEdit,
    onToggleFavourite,
    onTogglePin,
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
                aria-expanded={isExpanded}
                className="m-press flex items-center gap-2 w-full min-h-11 mb-1"
            >
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden className={`text-ink-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                <span className="m-overline text-ink-2 truncate">
                    {folderName}
                </span>
                <span className="m-chip m-chip-neutral !h-[22px] !px-2 !text-[12px]">
                    {notes.length}
                </span>
            </button>

            {isExpanded && (
                <div>
                    {notes.map(note => (
                        <NoteRow
                            key={note.id}
                            note={note}
                            onEdit={onEdit}
                            onToggleFavourite={onToggleFavourite}
                            onTogglePin={onTogglePin}
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
