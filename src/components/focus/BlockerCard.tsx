'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldX } from 'lucide-react'
import { MSwitch } from '@/components/mobile/ui'
import { plainCopy } from '@/components/mobile/copy'

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
            <div className="m-glass p-4 flex justify-between items-center gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="m-tile m-tile-info">
                        <ShieldX size={20} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="flex flex-col text-left min-w-0">
                        <span className="m-headline text-ink">
                            {t('focus.block')}
                        </span>
                        <span className="m-footnote text-ink-2">
                            {t('focus.offMessage')}
                        </span>
                    </div>
                </div>

                <MSwitch checked={false} onClick={handleToggle} label={t('focus.block')} />
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    role="status"
                    className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[100] max-w-[340px] w-max m-blur border border-line text-ink m-subhead px-5 py-3 rounded-full shadow-[var(--shadow-glass)] animate-[m-rise_200ms_var(--ease)_both]"
                >
                    {plainCopy(toast)}
                </div>
            )}
        </div>
    )
}
