'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldX } from 'lucide-react'

export default function BlockerCard() {
    const { t } = useTranslation()
    const [toast, setToast] = useState<string | null>(null)

    const handleToggle = () => {
        setToast('Coming soon!')
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-black/5 dark:border-slate-800 p-4 flex justify-between items-center w-full transition-colors">
                {/* Left Side: Icon & Text Container */}
                <div className="flex items-center gap-4">
                    {/* Left Element (Icon) */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10 text-[#FF7B2D] dark:bg-orange-500/20 shrink-0">
                        <ShieldX size={20} />
                    </div>

                    {/* Middle Element (Text) */}
                    <div className="flex flex-col text-left">
                        <span className="font-bold text-navy dark:text-slate-100 text-[16px]">
                            {t('focus.block')}
                        </span>
                        <span className="text-[13px] text-gray-400 dark:text-slate-400 font-normal">
                            {t('focus.offMessage')}
                        </span>
                    </div>
                </div>

                {/* Right Element (Control) */}
                <button
                    onClick={handleToggle}
                    className="w-[42px] h-[24px] bg-gray-200 dark:bg-slate-700 rounded-full relative shrink-0 transition-colors cursor-pointer"
                    aria-label={t('focus.block')}
                >
                    {/* Switch thumb (off position) */}
                    <div className="w-[18px] h-[18px] bg-white dark:bg-slate-300 rounded-full absolute left-[3px] top-[3px] shadow-sm pointer-events-none" />
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
