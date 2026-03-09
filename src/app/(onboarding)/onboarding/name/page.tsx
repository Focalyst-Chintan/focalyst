'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase'

export default function NamePage() {
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const validateName = (value: string): string => {
        const trimmed = value.trim()
        if (trimmed.length < 2) return 'Name must be at least 2 characters'
        if (trimmed.length > 50) return 'Name must be under 50 characters'
        if (!/^[a-zA-Z\s]+$/.test(trimmed)) return 'Name can only contain letters'
        return ''
    }

    const handleSubmit = async () => {
        const validationError = validateName(name)
        if (validationError) {
            setError(validationError)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('users').update({
                full_name: name.trim(),
                updated_at: new Date().toISOString()
            }).eq('id', user.id)
        }

        console.log('[Supabase] Saved name:', name.trim())
        router.push('/onboarding/profile-type')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit()
        }
    }

    return (
        <main className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="w-full max-w-[340px] flex flex-col items-center">
                {/* Question */}
                <h1 className="text-navy text-[22px] font-semibold text-center leading-7 mb-8">
                    Before we get started, what should I call you?
                </h1>

                {/* Input with inline submit */}
                <div className="w-full relative">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            setError('')
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your name"
                        className="w-full h-12 bg-card-bg rounded-xl px-4 pr-12 text-sm text-navy-darker placeholder:text-blue-muted outline-none transition-colors focus:ring-2 focus:ring-navy/30"
                        maxLength={50}
                        autoFocus
                    />

                    {/* Arrow submit button */}
                    <button
                        onClick={handleSubmit}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-navy flex items-center justify-center transition-all active:scale-[0.9] hover:bg-navy-dark"
                        aria-label="Submit name"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 12H19M19 12L12 5M19 12L12 19"
                                stroke="#FFFFFF"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Validation error */}
                {error && (
                    <p className="text-error text-xs mt-2 text-center">{error}</p>
                )}
            </div>
        </main>
    )
}
