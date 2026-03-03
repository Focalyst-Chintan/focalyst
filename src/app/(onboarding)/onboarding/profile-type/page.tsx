'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PROFILE_TYPES = [
    'Student',
    'Freelancer',
    'Creator',
    'Working Professional',
    'Entrepreneur',
] as const

export default function ProfileTypePage() {
    const [selected, setSelected] = useState<string | null>(null)
    const router = useRouter()

    const handleLetsGo = async () => {
        // TODO: Save to Supabase users.profile_type + set onboarding_done = true
        console.log('[Supabase Stub] Profile type:', selected)
        console.log('[Supabase Stub] Setting onboarding_done = true')
        router.push('/plan')
    }

    const handleSkip = async () => {
        // TODO: Set onboarding_done = true, profile_type = null
        console.log('[Supabase Stub] Skipping profile type, onboarding_done = true')
        router.push('/plan')
    }

    return (
        <main className="min-h-screen bg-navy flex flex-col items-center px-6 py-12">
            <div className="w-full max-w-[340px] flex flex-col flex-1">
                {/* Headline */}
                <div className="mt-8 mb-8">
                    <h1 className="text-white text-[22px] font-semibold leading-7">
                        What best describes you?
                    </h1>
                    <p className="text-white/80 text-sm font-normal mt-2">
                        We&apos;ll personalise Focalyst to fit your life
                    </p>
                </div>

                {/* Option Cards */}
                <div className="flex flex-col gap-3 flex-1">
                    {PROFILE_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelected(type)}
                            className={`w-full h-12 rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] ${selected === type
                                    ? 'bg-navy-darker text-white border border-white/20'
                                    : 'bg-white text-navy hover:bg-page-bg'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-auto pt-8 pb-4 flex flex-col items-center gap-3">
                    <button
                        onClick={handleLetsGo}
                        disabled={!selected}
                        className="w-full h-12 bg-navy-darker text-white text-[15px] font-semibold rounded-full transition-all active:scale-[0.98] hover:bg-navy-dark disabled:opacity-40 disabled:cursor-not-allowed border border-white/20"
                    >
                        Let&apos;s go
                    </button>

                    <button
                        onClick={handleSkip}
                        className="text-white text-sm font-normal hover:underline"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </main>
    )
}
