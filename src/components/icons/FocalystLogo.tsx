'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

export const FocalystLogo = ({
    size = 64,
    className = '',
    fallback = null,
}: {
    size?: number
    className?: string
    /** Shown instead of the image if it fails to load */
    fallback?: ReactNode
}) => {
    const [failed, setFailed] = useState(false)
    if (failed) return <>{fallback}</>
    return (
        <Image
            src="/small-logo.png"
            alt="Focalyst"
            width={size}
            height={size}
            className={`rounded-[22%] ${className}`}
            onError={() => setFailed(true)}
            priority
        />
    )
}
