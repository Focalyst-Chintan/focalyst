'use client'

import { useRouter } from 'next/navigation'
import { NewTaskIcon, NewSessionIcon, NewNoteIcon } from '@/components/icons'

interface QuickAddMenuProps {
    open: boolean
    onClose: () => void
}

const ACTIONS = [
    { href: '/plan/new-task', label: 'Task', Icon: NewTaskIcon },
    { href: '/focus', label: 'Session', Icon: NewSessionIcon },
    { href: '/notes/new', label: 'Note', Icon: NewNoteIcon },
]

export default function QuickAddMenu({ open, onClose }: QuickAddMenuProps) {
    const router = useRouter()

    if (!open) return null

    const handleAction = async (action: typeof ACTIONS[0], e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        if (action.label === 'Note') {
            router.push('/notes/new')
            onClose()
        } else {
            router.push(action.href)
            onClose()
        }
    }

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
                    <button
                        key={action.label}
                        onClick={(e) => handleAction(action, e)}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform cursor-pointer border-none bg-transparent outline-none p-0"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                            <action.Icon size={28} color="#FFFFFF" />
                        </div>
                        <span className="text-white text-[11px] font-medium">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>
        </>
    )
}
