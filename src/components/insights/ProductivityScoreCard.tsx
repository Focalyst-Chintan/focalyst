import { CycleIcon } from '@/components/icons/CycleIcon'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ProductivityScoreCard({ score, isPaid }: { score: number, isPaid: boolean }) {
    const { t } = useTranslation()
    const router = useRouter()
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
                <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[3px] flex flex-col items-center justify-center px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-navy dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-navy dark:text-slate-100 mb-2">Premium Feature</span>
                    <button
                        type="button"
                        onClick={() => router.push('/paywall')}
                        className="text-[11px] font-semibold text-white bg-accent px-3 py-1.5 rounded-full shadow-sm"
                    >
                        Unlock Productivity Score
                    </button>
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
                <p className="text-[12px] text-blue-muted font-medium mt-1">{t('insights.productivityScore')}</p>
            </div>
        </div>
    )
}
