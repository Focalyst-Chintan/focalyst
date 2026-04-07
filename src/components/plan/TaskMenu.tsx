'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface TaskMenuProps {
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
    onTag: () => void
}

export default function TaskMenu({ onEdit, onDelete, onRename, onTag }: TaskMenuProps) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const menuRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    // Function to calculate and update menu position
    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.right + window.scrollX - 140, // 140 is min-width
            })
        }
    }

    // Update position when menu opens or window changes
    useLayoutEffect(() => {
        if (open) {
            updatePosition()
            
            // For smooth tracking during transitions/scrolling
            const interval = setInterval(updatePosition, 50)
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition, true)
            
            return () => {
                clearInterval(interval)
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition, true)
            }
        }
    }, [open])

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                setOpen(false)
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
                onClick={() => setOpen(!open)}
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

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: `${coords.top + 8}px`,
                        left: `${coords.left}px`,
                    }}
                    className="bg-white rounded-xl shadow-xl border border-navy/10 py-1 min-w-[140px] z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                >
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
                </div>,
                document.body
            )}
        </div>
    )
}
