'use client'

import { useRouter } from 'next/navigation'

export default function WelcomePage() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[340px] flex flex-col items-center gap-8">
                {/* Brand */}
                <div className="text-center">
                    <h1 className="text-navy text-[28px] font-bold tracking-[0.18em]">
                        FOCALYST
                    </h1>
                    <p className="text-blue-muted text-[15px] mt-1.5 font-medium">
                        Own your time.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="w-full flex flex-col gap-3 mt-4">
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full h-12 bg-navy text-white text-[15px] font-semibold rounded-xl transition-all active:scale-[0.98] hover:bg-navy-dark"
                    >
                        Create account
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full h-12 rounded-xl border-[1.5px] border-navy text-navy text-[15px] font-semibold transition-all active:scale-[0.98] hover:bg-page-bg"
                    >
                        Sign in
                    </button>
                </div>
            </div>
        </main>
    )
}
