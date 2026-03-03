export const QuickAddIcon = ({
    size = 24,
    color = "#FFFFFF",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 48 48"
        fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M23.8495 11.9247L23.8495 35.7743"
            stroke={color} strokeWidth="3.97492" strokeLinecap="square" strokeLinejoin="round" />
        <path d="M35.7743 23.8495L11.9248 23.8495"
            stroke={color} strokeWidth="3.97492" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
)
