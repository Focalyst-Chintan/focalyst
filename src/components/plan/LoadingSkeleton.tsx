'use client'

interface LoadingSkeletonProps {
    rows?: number
    type?: 'task' | 'habit'
}

function SkeletonRow({ type = 'task' }: { type?: 'task' | 'habit' }) {
    return (
        <div className="flex items-center gap-3 bg-card-bg rounded-xl px-3 py-3 animate-pulse">
            {type === 'task' && (
                <div className="flex flex-col gap-[3px] shrink-0 mr-1">
                    <div className="w-4 h-[2px] bg-blue-muted/30 rounded-full" />
                    <div className="w-4 h-[2px] bg-blue-muted/30 rounded-full" />
                    <div className="w-4 h-[2px] bg-blue-muted/30 rounded-full" />
                </div>
            )}
            <div className="w-6 h-6 rounded-md bg-blue-muted/20 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="skeleton-shimmer h-4 rounded w-3/4" />
                {type === 'habit' && (
                    <div className="skeleton-shimmer h-3 rounded w-1/3 mt-1.5" />
                )}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-muted/10 shrink-0" />
        </div>
    )
}

export default function LoadingSkeleton({ rows = 3, type = 'task' }: LoadingSkeletonProps) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} type={type} />
            ))}
        </div>
    )
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="bg-error-light border border-error/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="#C0392B" strokeWidth="1.5" />
                <path d="M10 6V11" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14" r="0.75" fill="#C0392B" />
            </svg>
            <p className="flex-1 text-sm text-error">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-xs font-semibold text-navy bg-white px-3 py-1.5 rounded-lg hover:bg-card-bg transition-colors"
                >
                    Retry
                </button>
            )}
        </div>
    )
}
