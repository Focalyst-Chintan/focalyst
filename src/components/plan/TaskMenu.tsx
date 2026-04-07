'use client'

import { useState, useRef, useEffect } from 'react'

interface TaskMenuProps {
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
    onTag: () => void
    onOpenChange?: (isOpen: boolean) => void
}

export default function TaskMenu({ onEdit, onDelete, onRename, onTag, onOpenChange }: TaskMenuProps) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    const handleOpen = (newOpen: boolean) => {
        setOpen(newOpen)
        onOpenChange?.(newOpen)
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                handleOpen(false)
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation()
                    handleOpen(!open)
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    open ? 'bg-card-bg' : 'hover:bg-card-bg/50'
                }`}
                aria-label="Options"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="3" r="1.5" fill="#4A6C8C" />
                    <circle cx="8" cy="8" r="1.5" fill="#4A6C8C" />
                    <circle cx="8" cy="13" r="1.5" fill="#4A6C8C" />
                </svg>
            </button>

            {open && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-8 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-navy/10 py-1 min-w-[140px] z-[99] animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); handleOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRename(); handleOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Rename
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onTag(); handleOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                    >
                        Tag
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); handleOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
}
