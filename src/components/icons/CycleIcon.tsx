export const CycleIcon = ({
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
        <path d="M23 4V10H17"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1 20V14H7"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.51 9C4.30454 7.21326 5.62638 5.71969 7.2847 4.73379C8.94302 3.74789 10.8659 3.313 12.78 3.50153C14.6941 3.69006 16.5147 4.49272 17.98 5.79"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20.49 15C19.6955 16.7867 18.3736 18.2803 16.7153 19.2662C15.057 20.2521 13.1341 20.687 11.22 20.4985C9.30586 20.3099 7.48526 19.5073 6.02 18.21"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
