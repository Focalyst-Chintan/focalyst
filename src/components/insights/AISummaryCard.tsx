export function AISummaryCard() {
    return (
        <div className="m-glass p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="m-tile !w-8 !h-8 !rounded-[10px] text-primary-text">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
                    </svg>
                </div>
                <h3 className="m-title-3 text-ink">Focalyst AI analysis</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="m-subhead !font-semibold text-ink mb-1">Weekly review</h4>
                    <p className="m-footnote text-ink-2">
                        You had a highly productive week, maintaining a strong focus session routine mid-week. Your meditation streak is impressive, but task completion dipped slightly on Thursday. Consider adjusting priorities for the upcoming weekend to maintain momentum.
                    </p>
                </div>

                <div className="rounded-[16px] p-4 bg-[var(--m-surface-strong)] border border-line">
                    <h4 className="m-subhead !font-semibold text-ink mb-2">Suggestions for next week</h4>
                    <ul className="m-footnote text-ink-2 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-primary-text mt-0.5" aria-hidden>•</span>
                            <span>Try splitting longer tasks into 25-minute Pomodoro sessions to avoid burnout.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary-text mt-0.5" aria-hidden>•</span>
                            <span>You usually miss reading on Fridays. Consider setting a reminder for 8 PM.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
