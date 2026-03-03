'use client'

import Link from 'next/link'
import { NewTaskIcon, NewSessionIcon, NewNoteIcon } from '@/components/icons'

interface QuickAddMenuProps {
    open: boolean
    onClose: () => void
}

const ACTIONS = [
    { href: '/plan/new-task', label: 'Task', Icon: NewTaskIcon },
    { href: '/focus/new-session', label: 'Session', Icon: NewSessionIcon },
    { href: '/notes/new-note', label: 'Note', Icon: NewNoteIcon },
]

export default function QuickAddMenu({ open, onClose }: QuickAddMenuProps) {
    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/20"
                onClick={onClose}
            />

            {/* Floating capsule */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-navy rounded-full px-6 py-3 flex items-center gap-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                {ACTIONS.map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        onClick={onClose}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                            <action.Icon size={28} color="#FFFFFF" />
                        </div>
                        <span className="text-white text-[11px] font-medium">
                            {action.label}
                        </span>
                    </Link>
                ))}
            </div>
        </>
    )
}
