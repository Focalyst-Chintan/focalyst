'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function WelcomePage() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[340px] flex flex-col items-center">
                {/* Logo */}
                <div className="mb-4">
                    <Image
                        src="/logo.png"
                        alt="Focalyst Logo"
                        width={100}
                        height={100}
                        priority
                        className="invert brightness-200"
                    />
                </div>

                {/* Brand Name */}
                <h1 className="text-white text-[28px] font-bold tracking-[0.2em]">
                    FOCALYST
                </h1>
                <p className="text-white/70 text-[15px] mt-1 font-medium">
                    Own your time.
                </p>

                {/* Tagline */}
                <h2 className="text-white text-[32px] font-bold text-center leading-tight mt-8">
                    Your all-in-one productivity hub
                </h2>

                {/* CTA Buttons */}
                <div className="w-full flex flex-col items-center gap-3 mt-16">
                    <button
                        onClick={() => router.push('/login')}
                        className="w-[220px] h-11 bg-white/20 text-white text-[15px] font-semibold rounded-lg transition-all active:scale-[0.98] hover:bg-white/30"
                    >
                        Create account
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="text-white/70 text-[14px] font-medium transition-all hover:text-white"
                    >
                        Sign in
                    </button>
                </div>
            </div>
        </main>
    )
}
