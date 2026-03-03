import Link from 'next/link'
import { FocalystLogo } from '@/components/icons'

export default function WelcomePage() {
    return (
        <main className="min-h-screen bg-navy flex flex-col items-center justify-between px-6 py-12">
            {/* Top section — Logo + Branding */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="brightness-0 invert">
                    <FocalystLogo size={80} />
                </div>

                <h1 className="text-white text-[40px] font-bold tracking-[0.25em] mt-4">
                    FOCALYST
                </h1>

                <p className="text-white text-base font-normal opacity-90">
                    Own your time.
                </p>

                <p className="text-white text-[28px] font-bold text-center max-w-[260px] mt-6 leading-9">
                    Your all-in-one productivity hub
                </p>
            </div>

            {/* Bottom section — CTA */}
            <div className="w-full max-w-[340px] flex flex-col items-center gap-3 pb-8">
                <Link
                    href="/login"
                    className="w-full h-12 rounded-full border-[1.5px] border-white text-white text-[15px] font-semibold flex items-center justify-center transition-all active:scale-[0.98] hover:bg-white/10"
                >
                    Create account
                </Link>

                <Link
                    href="/login"
                    className="text-white text-sm font-normal hover:underline"
                >
                    Sign in
                </Link>
            </div>
        </main>
    )
}
