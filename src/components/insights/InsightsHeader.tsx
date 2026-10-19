'use client'

import { useTranslation } from 'react-i18next'

export function InsightsHeader({ formattedDate }: { formattedDate: string }) {
    const { t } = useTranslation()
    return (
        <div className="flex justify-between items-end mb-6">
            <h1 className="text-[24px] font-bold text-navy dark:text-slate-100">{t('insights.title')}</h1>
            <span className="text-[13px] text-blue-muted dark:text-slate-400">{t('insights.todayLabel')}, {formattedDate}</span>
        </div>
    )
}
export default InsightsHeader
