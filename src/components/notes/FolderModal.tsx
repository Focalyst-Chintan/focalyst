'use client'

import { useState } from 'react'
import { Note } from '@/types'

interface FolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolder: string | null;
    existingFolders: string[];
    onSave: (folderName: string | null) => void;
}

export const FolderModal = ({ isOpen, onClose, currentFolder, existingFolders, onSave }: FolderModalProps) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolder);

    if (!isOpen) return null;

    const handleSave = () => {
        if (newFolderName.trim()) {
            onSave(newFolderName.trim());
        } else {
            onSave(selectedFolder);
        }
        onClose();
        setNewFolderName('');
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center m-backdrop px-4">
            <div role="dialog" aria-modal="true" aria-labelledby="folder-title" className="m-sheet !rounded-[28px] !border w-full max-w-sm p-6 shadow-[var(--shadow-glass)]">
                <h3 id="folder-title" className="m-title-2 text-ink mb-4">Add to folder</h3>

                <div className="space-y-4">
                    {/* Existing Folders */}
                    {existingFolders.length > 0 && (
                        <div>
                            <p className="m-overline text-ink-2 mb-2">Existing folders</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedFolder(null)}
                                    aria-pressed={selectedFolder === null}
                                    className="m-pill m-press"
                                >
                                    None
                                </button>
                                {existingFolders.map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setSelectedFolder(f)}
                                        aria-pressed={selectedFolder === f}
                                        className="m-pill m-press"
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Folder Input */}
                    <div>
                        <p className="m-overline text-ink-2 mb-2">Or create a new one</p>
                        <input
                            type="text"
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={(e) => {
                                setNewFolderName(e.target.value);
                                if (e.target.value) setSelectedFolder(null);
                            }}
                            className="m-input"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="m-btn m-btn-secondary m-btn-sm m-press"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="m-btn m-btn-primary m-btn-sm m-press"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}
