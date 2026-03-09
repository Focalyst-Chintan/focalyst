export const ChevronRightIcon = ({
    size = 24,
    color = "#4A6C8C",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M9 5L16 12L9 19"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
