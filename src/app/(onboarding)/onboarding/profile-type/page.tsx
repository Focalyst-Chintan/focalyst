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

import { createClient } from '@/lib/supabase'

export default function ProfileTypePage() {
    const [selected, setSelected] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const completeOnboarding = async (profileType: string | null) => {
        try {
            setErrorMessage(null)
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                console.error('No authenticated user found:', userError)
                router.push('/')
                return
            }

            const { error } = await supabase
                .from('users')
                .update({
                    profile_type: profileType?.toLowerCase(),
                    onboarding_done: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (error) {
                console.error('Supabase error details:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                })
                throw error
            }

            router.refresh()
            router.push('/plan')

        } catch (err) {
            console.error('Failed to complete onboarding:', err)
            setErrorMessage('Something went wrong. Please try again.')
        }
    }

    const handleLetsGo = async () => {
        await completeOnboarding(selected)
    }

    const handleSkip = async () => {
        await completeOnboarding(null)
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
