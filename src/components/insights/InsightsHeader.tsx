'use client'

import { useTranslation } from 'react-i18next'

export function InsightsHeader({ formattedDate }: { formattedDate: string }) {
    const { t } = useTranslation()
    return (
        <div className="flex justify-between items-end gap-3">
            <h1 className="m-title-1 text-ink">{t('insights.title')}</h1>
            <span className="m-footnote text-ink-2 pb-1">{t('insights.todayLabel')}, {formattedDate}</span>
        </div>
    )
}
export default InsightsHeader
