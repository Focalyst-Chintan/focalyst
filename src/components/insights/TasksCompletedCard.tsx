'use client'



export function TasksCompletedCard({ completed, total }: { completed: number, total: number }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const radius = 38
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
        <div className="bg-card-bg rounded-3xl p-6 shadow-sm flex justify-between items-center w-full">
            <div className="space-y-1">
                <h3 className="text-[18px] font-semibold text-navy">Tasks Completed</h3>
                <p className="text-[13px] text-blue-muted">Great job! You&apos;re almost there.</p>
                <div className="pt-2">
                    <span className="text-[32px] font-bold text-accent mr-2">{completed}</span>
                    <span className="text-[16px] text-blue-muted">/ {total} tasks</span>
                </div>
            </div>
            <div className="w-24 h-24 relative flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#CAD6E4"
                        strokeWidth="12"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#FF751F"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-in-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[16px] font-semibold text-navy">{percentage}%</span>
                </div>
            </div>
        </div>
    )
}
