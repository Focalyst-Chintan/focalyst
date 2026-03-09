'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useNotes } from '@/hooks/useNotes'
import { NoteRow } from './NoteRow'
import { FolderGroup } from './FolderGroup'
import { NotesTabIcon } from '@/components/icons/NotesTabIcon'
import { generatePdf, slugify } from '@/lib/pdf'
import { Note } from '@/types'
import { FolderModal } from './FolderModal'

export type FilterType = 'All' | 'Notes' | 'Favourite' | 'Folders' | 'Voice notes'

interface NotesListProps {
    userId: string | undefined;
    searchQuery: string;
    activeFilter: FilterType;
    onNotesCountParsed: (count: number) => void;
}

export const NotesList = ({ userId, searchQuery, activeFilter, onNotesCountParsed }: NotesListProps) => {
    const router = useRouter()
    const { notes, loading, error, hasMore, fetchNotes, deleteNote, toggleFavourite, updateNote } = useNotes(userId)
    const [page, setPage] = useState(1)
    const [folderModalNote, setFolderModalNote] = useState<Note | null>(null)

    const existingFolders = useMemo(() => {
        const folders = new Set<string>();
        notes.forEach(n => {
            if (n.folder) folders.add(n.folder);
        });
        return Array.from(folders).sort();
    }, [notes]);

    // Trigger fetch when dependencies change
    useEffect(() => {
        if (userId) {
            let isFavourite = activeFilter === 'Favourite'
            // Determine note types to fetch
            let noteTypeFilter: string[] | undefined = undefined; // 'All' gets everything

            if (activeFilter === 'Notes') {
                // Notes should only show text notes (which are usually null or 'text')
                // Because we can't easily do OR (note_type is null OR note_type = 'text') natively with simple builder without .or(),
                // we assume text notes are null or we use .or() syntax.
                // It's cleaner to handle it in useNotes, but let's pass a specific flag or array.
                // Let's pass ['text'] and handle nulls in the hook if needed, or better, use .or('note_type.eq.text,note_type.is.null')
                noteTypeFilter = ['text'] // We will modify useNotes to handle this special case or just rely on 'text' if we backfill.
            } else if (activeFilter === 'Voice notes') {
                noteTypeFilter = ['voice']
            }

            fetchNotes(1, 20, undefined, isFavourite, false, activeFilter === 'Notes' ? [] : noteTypeFilter) // Passing empty array as special signal for 'Notes'
            setPage(1)
        }
    }, [userId, activeFilter, fetchNotes])

    // Cleanup blank notes on mount - only once when notes are loaded
    const [hasCleanedUp, setHasCleanedUp] = useState(false);
    useEffect(() => {
        if (userId && notes.length > 0 && !hasCleanedUp) {
            const blankNotes = notes.filter(n =>
                (!n.title || n.title.trim() === '' || n.title === 'Untitled document' || n.title === 'Untitled Note') &&
                (!n.content || n.content.replace(/<[^>]*>?/gm, '').trim() === '')
            );

            if (blankNotes.length > 0) {
                console.log('Cleaning up blank notes:', blankNotes.length);
                blankNotes.forEach(bn => deleteNote(bn.id));
            }
            setHasCleanedUp(true);
        }
    }, [userId, notes.length, notes, deleteNote, hasCleanedUp])

    // Inform parent of total notes for free plan limits
    // (In reality, free plan limit should check a dedicated server counter, 
    // but for UX we can use local array length as approximation if it's < 5, 
    // though if paginated, total count might be hidden. Assuming `count` isn't fully exposed, 
    // we'll pass `notes.length` for now or assume parent does its own check. We will pass notes.length)
    useEffect(() => {
        onNotesCountParsed(notes.length)
    }, [notes.length, onNotesCountParsed])

    const handleEdit = (note: Note) => {
        router.push(`/notes/${note.id}`)
    }

    const handleToggleFavourite = (note: Note) => {
        toggleFavourite(note.id, note.is_favourite)
    }

    const handleAddToFolder = (note: Note) => {
        setFolderModalNote(note);
    }

    const handleSaveFolder = async (newFolder: string | null) => {
        if (folderModalNote) {
            await updateNote(folderModalNote.id, { folder: newFolder });
        }
    }

    const handleDownload = (note: Note) => {
        const textContent = note.content ? note.content.replace(/<[^>]*>?/gm, '') : '';
        generatePdf(note.title, textContent, `${slugify(note.title || 'untitled-document')}-focalyst.pdf`)
    }

    const handleDelete = async (note: Note) => {
        console.log('handleDelete called for note:', note.id, note.title);
        if (window.confirm('Delete this note? This cannot be undone.')) {
            // Optimistic update
            setPage(1); // Reset page to avoid issues with lists shifting 
            const success = await deleteNote(note.id)
            if (!success) {
                console.error('Delete execution failed');
            }
        }
    }

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(p => p + 1)
            let isFavourite = activeFilter === 'Favourite'

            let noteTypeFilter: string[] | undefined = undefined;
            if (activeFilter === 'Notes') noteTypeFilter = []; // special signal for text/null
            else if (activeFilter === 'Voice notes') noteTypeFilter = ['voice'];

            fetchNotes(page + 1, 20, undefined, isFavourite, false, noteTypeFilter)
        }
    }

    // Filter notes by search query locally
    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const lowerQuery = searchQuery.toLowerCase();
        return notes.filter(n => {
            const textContent = n.content ? n.content.replace(/<[^>]*>?/gm, '') : '';
            return (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
                (textContent.toLowerCase().includes(lowerQuery));
        });
    }, [notes, searchQuery])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 mt-4 text-center">
                <p className="text-navy text-[15px] mb-4">{error}</p>
                <button
                    onClick={() => {
                        let noteTypeFilter: string[] | undefined = undefined;
                        if (activeFilter === 'Notes') noteTypeFilter = [];
                        else if (activeFilter === 'Voice notes') noteTypeFilter = ['voice'];
                        fetchNotes(1, 20, undefined, activeFilter === 'Favourite', false, noteTypeFilter)
                    }}
                    className="px-6 py-2 border-2 border-navy text-navy rounded-full font-semibold hover:bg-navy hover:text-white transition-colors"
                >
                    Retry
                </button>
            </div>
        )
    }

    if (loading && page === 1) {
        return (
            <div className="flex flex-col gap-3 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-card-bg rounded-xl animate-pulse w-full" />
                ))}
            </div>
        )
    }

    if (notes.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center pt-16 pb-8 text-center px-4">
                <NotesTabIcon size={64} color="#95A7B5" className="mb-4" />
                <h3 className="text-[16px] font-semibold text-navy mb-1">No notes yet</h3>
                <p className="text-[14px] text-blue-muted">Tap + New note to capture your first idea</p>
            </div>
        )
    }

    if (filteredNotes.length === 0 && searchQuery && !loading) {
        return (
            <div className="text-center py-8 text-blue-muted text-[15px]">
                No notes match your search.
            </div>
        )
    }

    // Render logic based on view mode
    return (
        <div className="mt-4 pb-24">
            {activeFilter === 'Folders' ? (
                // Folders View
                <div>
                    {(() => {
                        const folderMap: Record<string, Note[]> = {}
                        const unfiled: Note[] = []

                        filteredNotes.forEach(note => {
                            if (note.folder) {
                                if (!folderMap[note.folder]) folderMap[note.folder] = []
                                folderMap[note.folder].push(note)
                            } else {
                                unfiled.push(note)
                            }
                        })

                        return (
                            <>
                                {Object.entries(folderMap).map(([folderName, folderNotes]) => (
                                    <FolderGroup
                                        key={folderName}
                                        folderName={folderName}
                                        notes={folderNotes}
                                        onEdit={handleEdit}
                                        onToggleFavourite={handleToggleFavourite}
                                        onAddToFolder={handleAddToFolder}
                                        onDownload={handleDownload}
                                        onDelete={handleDelete}
                                    />
                                ))}
                                {unfiled.length > 0 && (
                                    <FolderGroup
                                        folderName="Unfiled"
                                        notes={unfiled}
                                        onEdit={handleEdit}
                                        onToggleFavourite={handleToggleFavourite}
                                        onAddToFolder={handleAddToFolder}
                                        onDownload={handleDownload}
                                        onDelete={handleDelete}
                                    />
                                )}
                            </>
                        )
                    })()}
                </div>
            ) : (
                // Standard View (All, Recents, Favourite)
                <div className="flex flex-col">
                    {filteredNotes.map(note => (
                        <NoteRow
                            key={note.id}
                            note={note}
                            onEdit={handleEdit}
                            onToggleFavourite={handleToggleFavourite}
                            onAddToFolder={handleAddToFolder}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full py-4 text-center text-[14px] font-medium text-blue-muted hover:text-navy disabled:opacity-50 mt-2"
                >
                    {loading ? 'Loading...' : 'Load more'}
                </button>
            )}

            <FolderModal
                isOpen={!!folderModalNote}
                onClose={() => setFolderModalNote(null)}
                currentFolder={folderModalNote?.folder || null}
                existingFolders={existingFolders}
                onSave={handleSaveFolder}
            />
        </div>
    )
}
