'use client'

import { useState, useRef, useEffect } from 'react'

interface TaskMenuProps {
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
    onTag: () => void
}

export default function TaskMenu({ onEdit, onDelete, onRename, onTag }: TaskMenuProps) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card-bg/50 transition-colors"
                aria-label="Options"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="3" r="1.5" fill="#4A6C8C" />
                    <circle cx="8" cy="8" r="1.5" fill="#4A6C8C" />
                    <circle cx="8" cy="13" r="1.5" fill="#4A6C8C" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-card-bg/50 py-1 min-w-[140px] z-20 animate-in fade-in duration-150">
                    <button
                        onClick={() => { onEdit(); setOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => { onRename(); setOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Rename
                    </button>
                    <button
                        onClick={() => { onTag(); setOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Tag
                    </button>
                    <button
                        onClick={() => { onDelete(); setOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
}
