'use client'

import { useRouter } from 'next/navigation'
import { ListTodo, NotebookPen, Timer } from 'lucide-react'

interface QuickAddMenuProps {
    open: boolean
    onClose: () => void
}

const ACTIONS = [
    { href: '/plan/new-task', label: 'Task', Icon: ListTodo },
    { href: '/focus', label: 'Session', Icon: Timer },
    { href: '/notes/new', label: 'Note', Icon: NotebookPen },
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
                className="fixed inset-0 z-50 bg-[rgba(3,9,30,0.40)] animate-[m-fade_200ms_ease-out_both]"
                onClick={onClose}
            />

            {/* Glass menu above the tab bar */}
            <div
                role="menu"
                className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-50 m-blur border border-line rounded-[28px] p-2 flex items-center gap-1 shadow-[var(--m-glow)] animate-[m-rise_200ms_var(--ease)_both]"
            >
                {ACTIONS.map((action) => (
                    <button
                        key={action.label}
                        role="menuitem"
                        onClick={(e) => handleAction(action, e)}
                        className="m-press flex flex-col items-center gap-1.5 w-[84px] py-2 rounded-[20px] cursor-pointer border-none bg-transparent outline-none"
                    >
                        <span className="w-12 h-12 rounded-[14px] bg-[var(--m-surface-strong)] border border-line flex items-center justify-center text-primary-text">
                            <action.Icon size={24} strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="m-caption text-ink">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>
        </>
    )
}
