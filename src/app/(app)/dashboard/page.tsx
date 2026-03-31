'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DashboardRedirect() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const paymentStatus = searchParams.get('payment') || searchParams.get('status')
        if (paymentStatus === 'success') {
            router.replace('/plan?payment=success')
        } else {
            router.replace('/plan')
        }
    }, [router, searchParams])

    return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
    )
}
