export function AISummaryCard() {
    return (
        <div className="mt-8 bg-gradient-to-br from-white to-[#F4F7FA] rounded-3xl p-6 shadow-sm border border-[#E2E8F0]">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="white" />
                    </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-navy">Focalyst AI Analysis</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="text-[14px] font-semibold text-navy mb-1">Weekly Review</h4>
                    <p className="text-[13px] text-blue-muted leading-relaxed">
                        You had a highly productive week, maintaining a strong focus session routine mid-week. Your meditation streak is impressive, but task completion dipped slightly on Thursday. Consider adjusting priorities for the upcoming weekend to maintain momentum.
                    </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-card-bg">
                    <h4 className="text-[13px] font-semibold text-navy mb-2">Suggestions for Next Week</h4>
                    <ul className="text-[12px] text-blue-muted space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-0.5">•</span>
                            <span>Try splitting longer tasks into 25-minute Pomodoro sessions to avoid burnout.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-0.5">•</span>
                            <span>You usually miss reading on Fridays. Consider setting a reminder for 8 PM.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
