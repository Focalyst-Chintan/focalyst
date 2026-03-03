export const InsightsTabIcon = ({
    size = 24,
    color = "#95A7B5",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 48 48"
        fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M41.7367 39.7492H5.9624"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M19.8746 31.7993V19.8746C19.8746 17.6793 18.095 15.8997 15.8997 15.8997C13.7044 15.8997 11.9248 17.6793 11.9248 19.8746V31.7993"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M35.7743 31.7994V11.9248C35.7743 9.72946 33.9947 7.94983 31.7994 7.94983C29.6041 7.94983 27.8245 9.72946 27.8245 11.9247V31.7994"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
    </svg>
)
