import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/auth/safeNext'

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
        pathname.startsWith('/account') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/how-to') ||
        pathname.startsWith('/paywall')

    // Auth routes (login)
    const isAuthRoute = pathname === '/login'

    // Onboarding routes
    const isOnboardingRoute = pathname.startsWith('/onboarding')

    // /start and /get-app are public (they are in neither protected list above)
    const isStartRoute = pathname === '/start'

    // If not logged in and trying to access protected routes
    if (!user && (isAppRoute || isOnboardingRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        url.searchParams.set('next', pathname + request.nextUrl.search)
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
            const next = safeNext(request.nextUrl.searchParams.get('next'))
            const url = request.nextUrl.clone()
            url.search = ''
            if (next) {
                return NextResponse.redirect(new URL(next, request.url))
            }
            url.pathname = onboardingDone ? '/plan' : '/start'
            return NextResponse.redirect(url)
        }

        // Logged in and onboarded → /start goes to the normal home,
        // except right after /onboarding/finish (its cookie keeps screens 28 to 32 on /start)
        const justSaved = request.cookies.get('onboarding_post')?.value === '1'
        if (onboardingDone && isStartRoute && !justSaved) {
            const url = request.nextUrl.clone()
            url.pathname = '/plan'
            url.search = ''
            return NextResponse.redirect(url)
        }

        // Logged in but not onboarded → the new onboarding at /start (screen 4, or the saved draft)
        if (!onboardingDone && isAppRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/start'
            url.search = ''
            return NextResponse.redirect(url)
        }

        // Logged in and onboarded → redirect away from onboarding
        // Exception: /onboarding/plans is always accessible for plan management
        const isPlansPage = pathname === '/onboarding/plans'
        // /onboarding/finish is reachable in both states: it saves the plan, or keeps an existing one ("Welcome back")
        const isFinishPage = pathname === '/onboarding/finish'
        if (onboardingDone && isOnboardingRoute && !isPlansPage && !isFinishPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/plan'
            return NextResponse.redirect(url)
        }
    }

    // --- Region Detection ---
    const country = request.headers.get('x-vercel-ip-country') || ''
    const region = country === 'IN' ? 'IN' : 'INT'
    supabaseResponse.cookies.set('user-region', region, {
        path: '/',
        httpOnly: false, // readable by client JS for region-based pricing
        secure: true,    // only transmit over HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         * - /api/* routes — these handle their own auth via Bearer token.
         *   The middleware MUST NOT intercept API routes because:
         *   (a) Capacitor WKWebView strips cookies on native fetch calls, so
         *       supabase.auth.getUser() returns null and the middleware would
         *       redirect the request to /login (an HTML page), which the frontend
         *       receives instead of a JSON/stream → the '[FRONTEND CRASH]: Received
         *       HTML response instead of AI stream' error.
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

