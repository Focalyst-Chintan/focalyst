'use client'

import { useEffect, useState, ReactNode } from 'react'
import '@/lib/i18n'

export function I18nProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-page-bg dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
        )
    }

    return <>{children}</>
}
export default I18nProvider
