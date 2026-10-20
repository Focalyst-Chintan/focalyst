'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <>
            {(!mounted || isLoading) && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF8F5]">
                    <div className="flex flex-col items-center space-y-5">
                        {/* Branded dark brown minimalist spinner */}
                        <div
                            className="w-12 h-12 rounded-full border-4 border-[#EAE3D9] border-t-[#3D2E20] animate-spin"
                        />
                        <span
                            className="text-[#3D2E20] font-bold tracking-[0.25em] text-sm animate-pulse"
                        >
                            FOCALYST
                        </span>
                    </div>
                </div>
            )}
            {children}
        </>
    )
}
