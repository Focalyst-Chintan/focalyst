export const NewNoteIcon = ({
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
        <path d="M15 21.6667L25 21.6667"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M15 15L21.6667 15"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M15 28.3333L21.6667 28.3333"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M31.6666 21.6667V25C31.6666 29.714 31.6666 32.0711 30.2021 33.5355C28.7377 35 26.3806 35 21.6666 35H18.3333C13.6192 35 11.2622 35 9.79772 33.5355C8.33325 32.0711 8.33325 29.714 8.33325 25V15C8.33325 10.286 8.33325 7.92893 9.79772 6.46447C11.2622 5 13.6192 5 18.3333 5"
            stroke={color} strokeWidth="3.33333" />
        <path d="M30 5L30 15"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
        <path d="M35 10L25 10"
            stroke={color} strokeWidth="3.33333" strokeLinecap="round" />
    </svg>
)
