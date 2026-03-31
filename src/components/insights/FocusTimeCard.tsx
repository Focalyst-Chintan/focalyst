import { TimerIcon } from '@/components/icons/TimerIcon'

export function FocusTimeCard({ minutes, trend }: { minutes: number, trend: number }) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-card-bg/30 flex items-center justify-center">
                    <TimerIcon size={20} color="#FF751F" />
                </div>
                {trend !== 0 && (
                    <span className={`text-[12px] font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-[24px] font-bold text-navy tracking-tight">
                    {hours}h {mins}m
                </h3>
                <p className="text-[12px] text-blue-muted font-medium mt-1">Total Focus Time</p>
            </div>
        </div>
    )
}
