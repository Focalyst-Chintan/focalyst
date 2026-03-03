export const NewTaskIcon = ({
    size = 40,
    color = "#33363F",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 40 40"
        fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="5" y="10" width="30" height="25" rx="3.33333"
            stroke={color} strokeWidth="3.33333" />
        <path d="M6.66663 18.3333H33.3333"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M16.6666 26.6667H23.3333"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M20 23.3333L20 30"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M13.3334 5L13.3334 11.6667"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M26.6666 5L26.6666 11.6667"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
    </svg>
)
