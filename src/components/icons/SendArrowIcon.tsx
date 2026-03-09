export const SendArrowIcon = ({
    size = 24,
    color = "#FFFFFF",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 24 24"
        fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 19V5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12L12 5L19 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
