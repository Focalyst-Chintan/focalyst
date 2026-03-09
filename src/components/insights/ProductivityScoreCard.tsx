import { CycleIcon } from '@/components/icons/CycleIcon'

export function ProductivityScoreCard({ score, isPaid }: { score: number, isPaid: boolean }) {
    let colorClass = 'text-green-500' // Green (75-100)
    if (score < 50) {
        colorClass = 'text-red-500' // Red (0-49)
    } else if (score < 75) {
        colorClass = 'text-accent' // Orange (50-74)
    }

    return (
        <div className="relative bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between overflow-hidden">
            {/* Feature Gate Overlay */}
            {!isPaid && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center mb-2 shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <span className="text-[11px] font-semibold text-navy bg-white px-3 py-1 rounded-full shadow-sm border border-card-bg">Upgrade to Pro</span>
                </div>
            )}

            <div className={`flex justify-between items-start mb-4 ${!isPaid ? 'opacity-30' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-card-bg/30 flex items-center justify-center">
                    <CycleIcon size={20} color="#FF751F" />
                </div>
            </div>
            <div className={!isPaid ? 'opacity-30' : ''}>
                <h3 className={`text-[32px] font-bold tracking-tight ${colorClass}`}>
                    {score}
                </h3>
                <p className="text-[12px] text-blue-muted font-medium mt-1">Productivity Score</p>
            </div>
        </div>
    )
}
