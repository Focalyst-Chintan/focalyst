'use client'

import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'

interface LoadingSkeletonProps {
    rows?: number
    type?: 'task' | 'habit'
}

function SkeletonRow({ type = 'task' }: { type?: 'task' | 'habit' }) {
    return (
        <div className="m-glass m-glass-md flex items-center gap-3 px-4 min-h-[60px]">
            {type === 'habit' ? (
                <div className="m-skel w-10 h-10 !rounded-[12px] shrink-0" />
            ) : (
                <div className="m-skel w-6 h-6 !rounded-full shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <div className="m-skel h-4 !rounded-md w-3/4" />
                {type === 'habit' && (
                    <div className="m-skel h-3 !rounded-md w-1/3 mt-2" />
                )}
            </div>
            <div className={`m-skel shrink-0 !rounded-full ${type === 'habit' ? 'w-8 h-8' : 'w-5 h-5'}`} />
        </div>
    )
}

export default function LoadingSkeleton({ rows = 3, type = 'task' }: LoadingSkeletonProps) {
    return (
        <div className="flex flex-col gap-2" aria-hidden>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} type={type} />
            ))}
        </div>
    )
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
    const { t } = useTranslation()
    return (
        <div role="alert" className="m-glass m-glass-md px-4 py-3 flex items-center gap-3">
            <span className="m-tile !w-9 !h-9 !bg-[color-mix(in_srgb,var(--m-danger)_14%,transparent)] !border-[color-mix(in_srgb,var(--m-danger)_40%,transparent)] text-[var(--m-danger-text)]">
                <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <p className="flex-1 m-footnote text-ink">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="m-btn m-btn-secondary m-btn-sm m-press"
                >
                    {t('plan.retry')}
                </button>
            )}
        </div>
    )
}
