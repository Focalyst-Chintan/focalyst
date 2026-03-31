import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Focalyst',
        short_name: 'Focalyst',
        description: 'Your all-in-one AI productivity hub.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F7FA',
        theme_color: '#4A6C8C',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/apple-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
