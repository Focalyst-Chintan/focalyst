import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Allow requests through when Supabase is not configured (local development)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session so it doesn't expire
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protected app routes
    const isAppRoute =
        pathname.startsWith('/plan') ||
        pathname.startsWith('/focus') ||
        pathname.startsWith('/notes') ||
        pathname.startsWith('/insights') ||
        pathname.startsWith('/account')

    // Auth routes (welcome + login)
    const isAuthRoute = pathname === '/' || pathname === '/login'

    // Onboarding routes
    const isOnboardingRoute = pathname.startsWith('/onboarding')

    // If not logged in and trying to access protected routes
    if (!user && (isAppRoute || isOnboardingRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // If logged in, check onboarding status for redirects
    if (user) {
        // Fetch user profile for onboarding status
        const { data: profile } = await supabase
            .from('users')
            .select('onboarding_done')
            .eq('id', user.id)
            .single()

        const onboardingDone = profile?.onboarding_done ?? false

        // Logged in user on auth routes → redirect accordingly
        if (isAuthRoute) {
            const url = request.nextUrl.clone()
            url.pathname = onboardingDone ? '/plan' : '/onboarding/plans'
            return NextResponse.redirect(url)
        }

        // Logged in but not onboarded → redirect to onboarding (except onboarding routes)
        if (!onboardingDone && isAppRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding/plans'
            return NextResponse.redirect(url)
        }

        // Logged in and onboarded → redirect away from onboarding
        // Exception: /onboarding/plans is always accessible for plan management
        const isPlansPage = pathname === '/onboarding/plans'
        if (onboardingDone && isOnboardingRoute && !isPlansPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/plan'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
