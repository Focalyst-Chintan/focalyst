'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { UserAccountIcon, AIChatIcon } from '@/components/icons'
import { useChat } from '@/context/ChatContext'
import { useAuth } from '@/context/AuthContext'

export default function Header() {
    const { openChat } = useChat()
    const { user } = useAuth()
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const supabase = createClient()

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

    return (
        <header 
            style={{ 
                paddingTop: 'env(safe-area-inset-top)',
                height: 'calc(56px + env(safe-area-inset-top))',
                backgroundColor: '#FAF8F5',
                borderBottomColor: '#EAE3D9',
            }}
            className="sticky top-0 z-[60] flex items-center justify-between px-5 border-b transition-colors duration-300"
        >
            <Link 
                href="/account" 
                aria-label="Account" 
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors"
                style={{ backgroundColor: '#EAE3D9' }}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <UserAccountIcon size={28} color="#3D2E20" />
                )}
            </Link>

            <div className="flex items-center justify-center">
                <Link href="/app" className="cursor-pointer">
                    <span 
                        className="font-bold text-[18px] tracking-[0.2em] transition-colors"
                        style={{ color: '#3D2E20' }}
                    >
                        FOCALYST
                    </span>
                </Link>
            </div>

            <button 
                onClick={openChat} 
                aria-label="AI Chat" 
                className="hover:opacity-80 transition-opacity"
                style={{ color: '#3D2E20' }}
            >
                <AIChatIcon size={28} color="currentColor" />
            </button>
        </header>
    )
}
