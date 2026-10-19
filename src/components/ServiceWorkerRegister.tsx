'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {

                    })
                    .catch((error) => {
                        console.error('Service Worker registration failed:', error)
                    })
            })
        }
    }, [])

    return null
}
