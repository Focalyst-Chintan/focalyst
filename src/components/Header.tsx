'use client'

import Link from 'next/link'
import { UserAccountIcon, AIChatIcon } from '@/components/icons'

export default function Header() {
    return (
        <header className="sticky top-0 z-30 bg-white flex items-center justify-between px-5 h-14 border-b border-card-bg/50">
            <Link href="/account" aria-label="Account">
                <UserAccountIcon size={28} color="#4A6C8C" />
            </Link>

            <h1 className="text-navy text-[16px] font-bold tracking-[0.15em]">
                FOCALYST
            </h1>

            <Link href="/ai-chat" aria-label="AI Chat">
                <AIChatIcon size={28} color="#4A6C8C" />
            </Link>
        </header>
    )
}
