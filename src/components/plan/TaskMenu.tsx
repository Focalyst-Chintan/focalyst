'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface TaskMenuProps {
    onEdit: () => void
    onDelete: () => void
    onRename: () => void
    onTag: () => void
    onOpenChange?: (isOpen: boolean) => void
}

export default function TaskMenu({ onEdit, onDelete, onRename, onTag, onOpenChange }: TaskMenuProps) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const menuRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        const newOpen = !open
        setOpen(newOpen)
        onOpenChange?.(newOpen)
    }

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const menuWidth = 140
            const menuHeight = 160 // Approximate height for 4 buttons

            let top = rect.bottom + 8
            let left = rect.right - menuWidth

            // Keep within viewport horizontally
            if (left < 10) left = 10
            if (left + menuWidth > window.innerWidth - 10) {
                left = window.innerWidth - menuWidth - 10
            }

            // Keep within viewport vertically (flip to top if needed)
            if (top + menuHeight > window.innerHeight - 10) {
                top = rect.top - menuHeight - 8
            }

            setCoords({ top, left })
        }
    }

    useLayoutEffect(() => {
        if (open) {
            updatePosition()
            
            // Continuous tracking for smooth scrolling/animations
            const frameId = requestAnimationFrame(function track() {
                updatePosition()
                if (open) requestAnimationFrame(track)
            })

            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)

            return () => {
                cancelAnimationFrame(frameId)
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [open])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                setOpen(false)
                onOpenChange?.(false)
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open, onOpenChange])

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={handleToggle}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
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
                <>
                    {/* Transparent overlay to help with mobile dismissals */}
                    <div 
                        className="fixed inset-0 z-[9998] bg-transparent" 
                        onClick={(e) => {
                            e.stopPropagation()
                            setOpen(false)
                            onOpenChange?.(false)
                        }}
                    />
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            top: `${coords.top}px`,
                            left: `${coords.left}px`,
                        }}
                        className="bg-white rounded-xl shadow-[0_10px_32px_rgba(0,0,0,0.2)] border border-navy/10 py-1 min-w-[140px] z-[9999] animate-in fade-in zoom-in-95 duration-150 origin-top-right pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); onOpenChange?.(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRename(); setOpen(false); onOpenChange?.(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                        >
                            Rename
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTag(); setOpen(false); onOpenChange?.(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-page-bg transition-colors"
                        >
                            Tag
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); onOpenChange?.(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
