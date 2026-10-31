import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AnimatedNumber } from '@/components/mobile/insights/AnimatedNumber'

export function ProductivityScoreCard({ score, isPaid }: { score: number, isPaid: boolean }) {
    const { t } = useTranslation()
    const router = useRouter()

    // The one highlight tile on this screen (spec 5.4)
    return (
        <div className="m-highlight relative p-4 flex flex-col justify-between min-h-[132px] overflow-hidden">
            {/* Feature Gate Overlay */}
            {!isPaid && (
                <div className="absolute inset-0 z-10 flex flex-col items-start justify-end p-4 bg-[linear-gradient(180deg,transparent,rgba(3,25,91,0.35))]">
                    <Lock className="w-4 h-4 text-snow mb-1.5" aria-hidden />
                    <span className="m-footnote text-snow/90 mb-2">Pro feature</span>
                    <button
                        type="button"
                        onClick={() => router.push('/paywall')}
                        className="m-press m-caption !font-semibold text-[#0B2CB1] bg-snow px-3 h-8 rounded-full"
                    >
                        See Pro
                    </button>
                </div>
            )}

            <h3 className={`m-footnote text-snow/85 ${!isPaid ? 'opacity-40' : ''}`}>{t('insights.productivityScore')}</h3>
            <div className={!isPaid ? 'opacity-25 blur-[2px]' : ''} aria-hidden={!isPaid || undefined}>
                <p className="flex items-baseline gap-1">
                    <span className="m-stat-l text-snow">
                        {isPaid ? (
                            <AnimatedNumber metric="score:week" value={score} label={`${score} out of 100`} render={(n) => n} />
                        ) : score}
                    </span>
                    <span className="m-subhead text-snow/75 m-num">/ 100</span>
                </p>
                <p className="m-caption text-snow/80 mt-1">Based on tasks, habits and focus</p>
            </div>
        </div>
    )
}
