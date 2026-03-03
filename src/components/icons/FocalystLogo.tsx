import Image from 'next/image'

export const FocalystLogo = ({ size = 64 }: { size?: number }) => (
    <Image
        src="/logo.png"
        alt="Focalyst Logo"
        width={size}
        height={size}
        priority
    />
)
