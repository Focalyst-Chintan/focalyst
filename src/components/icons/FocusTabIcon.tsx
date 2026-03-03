export const FocusTabIcon = ({
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
        <circle cx="23.8495" cy="23.8495" r="13.9122"
            stroke={color} strokeWidth="3.97492" />
        <circle cx="23.8496" cy="23.8496" r="3.97492"
            fill={color} stroke={color} strokeWidth="3.97492" />
        <path d="M23.8495 9.93732V5.9624"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M37.7618 23.8495L41.7367 23.8495"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M23.8495 41.7367L23.8495 37.7618"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M5.96233 23.8495H9.93726"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
    </svg>
)
