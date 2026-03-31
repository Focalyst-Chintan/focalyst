'use client'

import { useState, useEffect } from 'react'

export default function BlockerCard() {
    const [toast, setToast] = useState<string | null>(null)

    const handleToggle = () => {
        setToast('This feature is coming soon!')
        setTimeout(() => setToast(null), 3000)
    }

    // Clean up timeout if component unmounts
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    return (
        <div className="w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex justify-between items-center w-full">
                {/* Left Side: Icon & Text Container */}
                <div className="flex items-center gap-4">
                    {/* Left Element (Icon) */}
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        {/* Solid blue circle */}
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center relative overflow-hidden">
                            {/* White diagonal slash */}
                            <div className="w-[3px] h-9 bg-white rotate-45 absolute" />
                        </div>
                    </div>

                    {/* Middle Element (Text) */}
                    <div className="flex flex-col text-left">
                        <span className="font-bold text-navy text-[16px]">
                            Block distractions
                        </span>
                        <span className="text-[13px] text-gray-400 font-normal">
                            Focus mode is currently off
                        </span>
                    </div>
                </div>

                {/* Right Element (Control) */}
                <button
                    onClick={handleToggle}
                    className="w-[42px] h-[24px] bg-gray-200 rounded-full relative shrink-0 transition-colors cursor-pointer"
                    aria-label="Toggle block distractions"
                >
                    {/* Switch thumb (off position) */}
                    <div className="w-[18px] h-[18px] bg-white rounded-full absolute left-[3px] top-[3px] shadow-sm pointer-events-none" />
                </button>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] max-w-[340px] w-auto bg-navy text-white text-[14px] text-center font-medium px-6 py-3 rounded-xl shadow-lg transition-all"
                    style={{ animation: 'fadeInDown 0.3s ease-out forwards' }}
                >
                    {toast}
                </div>
            )}
        </div>
    )
}
