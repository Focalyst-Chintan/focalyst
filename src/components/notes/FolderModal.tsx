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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
                <h3 className="text-navy text-lg font-bold mb-4">Add to Folder</h3>

                <div className="space-y-4">
                    {/* Existing Folders */}
                    {existingFolders.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase text-blue-muted mb-2 tracking-wider">Existing Folders</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedFolder(null)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFolder === null ? 'bg-navy text-white' : 'bg-card-bg text-navy hover:bg-card-bg/80'}`}
                                >
                                    None
                                </button>
                                {existingFolders.map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setSelectedFolder(f)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFolder === f ? 'bg-navy text-white' : 'bg-card-bg text-navy hover:bg-card-bg/80'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Folder Input */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-muted mb-2 tracking-wider">Or Create New</p>
                        <input
                            type="text"
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={(e) => {
                                setNewFolderName(e.target.value);
                                if (e.target.value) setSelectedFolder(null);
                            }}
                            className="w-full px-4 py-2 bg-page-bg text-navy rounded-xl outline-none focus:ring-2 focus:ring-navy/20 border border-transparent focus:border-navy/30 transition-all font-medium text-[15px]"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-navy font-semibold hover:bg-card-bg/50 rounded-full transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-navy text-white font-semibold rounded-full shadow-md shadow-navy/20 hover:shadow-lg hover:shadow-navy/30 transition-all"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}
