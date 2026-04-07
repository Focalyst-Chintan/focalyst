'use client'

export function LevelProgressBar({
    progress,
    color,
    height = 6,
    className = ''
}: {
    progress: number
    color: string
    height?: number
    className?: string
}) {
    return (
        <div
            className={`w-full rounded-full overflow-hidden ${className}`}
            style={{ height: `${height}px`, backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
            <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                    width: `${Math.max(progress, 2)}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}40`
                }}
            />
        </div>
    )
}
