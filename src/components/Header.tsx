'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Sparkles } from 'lucide-react'
import { useScrolledPast } from '@/components/mobile/hooks'
import { useChat } from '@/context/ChatContext'
import { useAuth } from '@/context/AuthContext'

export default function Header() {
    const { openChat } = useChat()
    const { user } = useAuth()
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const supabase = createClient()
    const scrolled = useScrolledPast(8)

    useEffect(() => {
        async function fetchProfile() {
            if (!user) return
            const { data: profile } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', user.id)
                .single()

            if (profile?.avatar_url) {
                setAvatarUrl(profile.avatar_url)
            }
        }
        fetchProfile()
    }, [user, supabase])

    const initial = (user?.user_metadata?.full_name || user?.email || '?').trim().charAt(0).toUpperCase()

    return (
        <header
            className={`sticky top-0 z-[60] flex items-center justify-between px-5 h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b transition-[background-color,border-color,backdrop-filter] duration-150 ${
                scrolled ? 'm-blur border-line' : 'bg-transparent border-transparent'
            }`}
        >
            <Link
                href="/account"
                aria-label="Account"
                className="m-press w-11 h-11 -ml-1 flex items-center justify-center rounded-full"
            >
                <span className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-[image:var(--m-grad-primary)] text-snow text-[15px] font-semibold ring-1 ring-line">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="Profile"
                            width={36}
                            height={36}
                            sizes="36px"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span aria-hidden>{initial}</span>
                    )}
                </span>
            </Link>

            <Link href="/app" className="m-press flex items-center justify-center min-h-11 px-2">
                <span className="font-ui font-semibold text-[15px] tracking-[0.35em] mr-[-0.35em] text-ink">
                    FOCALYST
                </span>
            </Link>

            <button
                type="button"
                onClick={openChat}
                aria-label="Ask Focalyst AI"
                className="m-press w-11 h-11 -mr-1 flex items-center justify-center rounded-full"
            >
                <span className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-[var(--m-ai-bg)] text-[var(--m-ai-fg)] border border-[var(--m-ai-border)]">
                    <Sparkles size={20} strokeWidth={1.75} aria-hidden />
                </span>
            </button>
        </header>
    )
}
