import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const errorRedirect = request.nextUrl.clone()
  errorRedirect.pathname = '/reset-password'
  errorRedirect.search = '?error=expired'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      if (type === 'recovery') {
        const successRedirect = request.nextUrl.clone()
        successRedirect.pathname = '/reset-password'
        successRedirect.search = ''
        return NextResponse.redirect(successRedirect)
      }

      // If other verification types (e.g. signup, email_change), redirect to next or default
      const next = searchParams.get('next') ?? '/onboarding/plans'
      const successRedirect = request.nextUrl.clone()
      successRedirect.pathname = next
      successRedirect.search = ''
      return NextResponse.redirect(successRedirect)
    }
  }

  // Fallback: If code is provided instead of token_hash
  const code = searchParams.get('code')
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const successRedirect = request.nextUrl.clone()
      successRedirect.pathname = '/reset-password'
      successRedirect.search = ''
      return NextResponse.redirect(successRedirect)
    }
  }

  return NextResponse.redirect(errorRedirect)
}
