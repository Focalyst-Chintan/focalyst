export const GlobeIcon = ({
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
        <circle cx="12" cy="12" r="10"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.22 12H21.78"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2.22C14.5015 4.88648 15.9171 8.35646 16 12C15.9171 15.6435 14.5015 19.1135 12 21.78C9.49852 19.1135 8.08295 15.6435 8 12C8.08295 8.35646 9.49852 4.88648 12 2.22Z"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
