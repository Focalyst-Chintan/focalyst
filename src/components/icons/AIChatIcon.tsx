export const AIChatIcon = ({
    size = 37,
    color = "#33363F",
    className = "",
}: {
    size?: number
    color?: string
    className?: string
}) => (
    <svg width={size} height={size} viewBox="0 0 37 37"
        fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M18.5 6.16666C25.3115 6.16666 30.8334 11.6885 30.8334 18.5V26.3485C30.8334 27.6537 30.8334 28.3063 30.6389 28.8275C30.3264 29.6654 29.6655 30.3264 28.8275 30.6389C28.3063 30.8333 27.6537 30.8333 26.3485 30.8333H18.5C11.6885 30.8333 6.16669 25.3115 6.16669 18.5"
            stroke={color} strokeWidth="3.08333" />
        <path d="M13.875 16.9583L23.125 16.9583"
            stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.70831 12.3333L7.70831 3.08334"
            stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.08331 7.70834L12.3333 7.70834"
            stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 23.125H23.125"
            stroke={color} strokeWidth="3.08333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
