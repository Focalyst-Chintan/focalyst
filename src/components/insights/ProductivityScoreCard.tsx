import { CycleIcon } from '@/components/icons/CycleIcon'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AnimatedNumber } from '@/components/mobile/insights/AnimatedNumber'

export function ProductivityScoreCard({ score, isPaid }: { score: number, isPaid: boolean }) {
    const { t } = useTranslation()
    const router = useRouter()

    // The one highlight tile on this screen (spec 5.4); same content as before
    return (
        <div className="m-highlight relative p-5 flex flex-col justify-between overflow-hidden">
            {/* Feature Gate Overlay */}
            {!isPaid && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center bg-[rgba(3,25,91,0.35)]">
                    <div className="w-10 h-10 rounded-full bg-snow/20 flex items-center justify-center mb-2">
                        <Lock className="w-5 h-5 text-snow" aria-hidden />
                    </div>
                    <span className="m-footnote !font-semibold text-snow mb-2">Pro feature</span>
                    <button
                        type="button"
                        onClick={() => router.push('/paywall')}
                        className="m-press m-caption !font-semibold text-[#0B2CB1] bg-snow px-3 h-8 rounded-full"
                    >
                        See productivity score
                    </button>
                </div>
            )}

            <div className={`flex justify-between items-start mb-4 ${!isPaid ? 'opacity-30' : ''}`}>
                <div className="w-10 h-10 rounded-[12px] bg-snow/15 flex items-center justify-center text-snow">
                    <CycleIcon size={20} color="currentColor" />
                </div>
            </div>
            <div className={!isPaid ? 'opacity-30' : ''}>
                <h3 className="m-stat-l text-snow">
                    {isPaid ? (
                        <AnimatedNumber metric="score:week" value={score} label={`${score}`} render={(n) => n} />
                    ) : score}
                </h3>
                <p className="m-footnote text-snow/90 mt-1">{t('insights.productivityScore')}</p>
            </div>
        </div>
    )
}
