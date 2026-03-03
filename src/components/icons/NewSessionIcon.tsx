export const NewSessionIcon = ({
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
        <circle cx="20.0001" cy="23.3333" r="13.3333"
            stroke={color} strokeWidth="3.33333" />
        <path d="M20 23.3333L20 18.3333"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M29.1667 12.5L31.6668 10"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M16.7802 3.95096C16.9701 3.77377 17.3886 3.61719 17.9707 3.50552C18.5529 3.39384 19.2661 3.33331 19.9999 3.33331C20.7337 3.33331 21.447 3.39384 22.0291 3.50552C22.6113 3.61719 23.0298 3.77377 23.2197 3.95096"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
    </svg>
)
