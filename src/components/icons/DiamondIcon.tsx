export const DiamondIcon = ({
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
        <path d="M6 3H18L22 9L12 21L2 9L6 3Z"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 9H22"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21L6 9"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21L18 9"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3L11 9"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3L13 9"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
