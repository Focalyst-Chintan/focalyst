'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { UserAccountIcon, AIChatIcon } from '@/components/icons'
import { useChat } from '@/context/ChatContext'

export default function Header() {
    const { openChat } = useChat()
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function fetchProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single()

                if (profile?.avatar_url) {
                    setAvatarUrl(profile.avatar_url)
                }
            }
        }
        fetchProfile()
    }, [supabase])

    return (
        <header className="sticky top-0 z-[60] bg-white flex items-center justify-between px-5 h-14 border-b border-card-bg/50">
            <Link href="/account" aria-label="Account" className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-card-bg">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <UserAccountIcon size={28} color="#4A6C8C" />
                )}
            </Link>

            <h1 className="text-navy text-[16px] font-bold tracking-[0.15em]">
                FOCALYST
            </h1>

            <button onClick={openChat} aria-label="AI Chat">
                <AIChatIcon size={28} color="#4A6C8C" />
            </button>
        </header>
    )
}
