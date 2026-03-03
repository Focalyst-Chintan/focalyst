export const PlanTabIcon = ({
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
        <rect x="5.9624" y="11.9247" width="35.7743" height="29.8119" rx="3.97492"
            stroke={color} strokeWidth="3.97492" />
        <path d="M5.9624 19.8746C5.9624 16.127 5.9624 14.2532 7.12663 13.089C8.29086 11.9247 10.1647 11.9247 13.9122 11.9247H33.7869C37.5344 11.9247 39.4082 11.9247 40.5725 13.089C41.7367 14.2532 41.7367 16.127 41.7367 19.8746H5.9624Z"
            fill={color} />
        <path d="M13.9122 5.9624L13.9122 11.9248"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
        <path d="M33.7869 5.9624L33.7869 11.9248"
            stroke={color} strokeWidth="3.97492" strokeLinecap="round" />
    </svg>
)
