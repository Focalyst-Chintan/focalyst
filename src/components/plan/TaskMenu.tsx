'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

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
                className={`m-press w-11 h-11 -mr-2 flex items-center justify-center rounded-full cursor-pointer text-ink-2 ${
                    open ? 'bg-[var(--m-surface-strong)]' : 'hover:bg-[var(--m-surface-strong)]'
                }`}
                aria-label="Options"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden />
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
                        role="menu"
                        className="m-blur border border-line rounded-[16px] shadow-[var(--shadow-glass)] p-1.5 min-w-[160px] z-[9999] animate-[m-rise_200ms_var(--ease)_both] origin-top-right pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); onOpenChange?.(false) }}
                            role="menuitem"
                            className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-ink hover:bg-[var(--m-surface-strong)] active:bg-[var(--m-surface-strong)] transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRename(); setOpen(false); onOpenChange?.(false) }}
                            role="menuitem"
                            className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-ink hover:bg-[var(--m-surface-strong)] active:bg-[var(--m-surface-strong)] transition-colors"
                        >
                            Rename
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTag(); setOpen(false); onOpenChange?.(false) }}
                            role="menuitem"
                            className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-ink hover:bg-[var(--m-surface-strong)] active:bg-[var(--m-surface-strong)] transition-colors"
                        >
                            Tag
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); onOpenChange?.(false) }}
                            role="menuitem"
                            className="w-full text-left px-3 h-11 rounded-[10px] m-callout text-[var(--m-danger-text)] hover:bg-[color-mix(in_srgb,var(--m-danger)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--m-danger)_12%,transparent)] transition-colors"
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
