'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/plans`,
                },
            })
            if (error) {
                console.error('Google login error:', error.message)
            }
        } catch {
            console.error('Failed to initiate Google login')
        }
    }

    const handleAppleSignIn = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/plans`,
                },
            })
            if (error) {
                console.error('Error logging in with Apple:', error.message)
                setMessage(error.message)
            }
        } catch {
            console.error('Failed to initiate Apple login')
        }
    }

    const handleLogin = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!email || !password) {
            setMessage('Please enter both email and password.')
            return
        }
        setIsLoading(true)
        setMessage('')
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                setMessage(error.message)
                console.error(error)
            } else {
                router.refresh()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('onboarding_done')
                        .eq('id', user.id)
                        .single()
                    if (profile?.onboarding_done) {
                        router.push('/plan')
                    } else {
                        router.push('/onboarding/plans')
                    }
                } else {
                    router.push('/plan')
                }
            }
        } catch (err: any) {
            setMessage(err.message || 'Login failed.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignUp = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!email || !password) {
            setMessage('Please enter both email and password.')
            return
        }
        setIsLoading(true)
        setMessage('')
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/plans`,
                }
            })
            if (error) {
                setMessage(error.message)
                console.error(error)
            } else {
                setMessage('Check your email for the confirmation link.')
            }
        } catch (err: any) {
            setMessage(err.message || 'Sign up failed.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="w-full max-w-[340px] flex flex-col items-center gap-6">
                {/* Heading */}
                <div className="text-center mb-4">
                    <h1 className="text-navy text-[24px] font-bold tracking-[0.15em]">
                        FOCALYST
                    </h1>
                    <p className="text-blue-muted text-sm mt-1">
                        Own your time.
                    </p>
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full h-12 rounded-xl border-[1.5px] border-navy text-navy text-[15px] font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-page-bg"
                >
                    {/* Google icon SVG */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                {/* Apple Login Button */}
                <button
                    onClick={handleAppleSignIn}
                    className="w-full h-12 bg-black border-[1.5px] border-black text-white text-[15px] font-semibold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-black/90"
                >
                    {/* Apple icon SVG */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-.1 3.81 1.5a5.22 5.22 0 0 1 3.23 4.83c-.02 2.87 2.33 3.88 2.36 3.9a10.42 10.42 0 0 1-2.8 4.02zM15.97 4.17A5.07 5.07 0 0 0 17.2 1c-1.32.05-2.92.88-3.87 2-1 1.12-1.6 2.73-1.31 4 1.46.1 2.97-.73 3.95-1.83z" />
                    </svg>
                    Continue with Apple
                </button>

                {/* Divider */}
                <div className="flex items-center w-full gap-4">
                    <div className="flex-1 h-[1px] bg-card-bg"></div>
                    <span className="text-blue-muted text-xs font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-[1px] bg-card-bg"></div>
                </div>

                {/* Email Login */}
                <div className="w-full flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full h-12 bg-card-bg rounded-xl px-4 text-sm text-navy-darker placeholder:text-blue-muted outline-none border-[1.5px] border-transparent focus:border-navy/20 transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full h-12 bg-card-bg rounded-xl px-4 text-sm text-navy-darker placeholder:text-blue-muted outline-none border-[1.5px] border-transparent focus:border-navy/20 transition-all"
                    />
                    <div className="flex gap-2 w-full mt-1">
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="flex-1 h-12 bg-navy text-white text-[15px] font-semibold rounded-xl transition-all active:scale-[0.98] hover:bg-navy-dark disabled:opacity-50"
                        >
                            {isLoading ? 'Wait...' : 'Log In'}
                        </button>
                        <button
                            onClick={handleSignUp}
                            disabled={isLoading}
                            className="flex-1 h-12 border-[1.5px] border-navy text-navy text-[15px] font-semibold rounded-xl transition-all active:scale-[0.98] hover:bg-page-bg disabled:opacity-50"
                        >
                            Sign Up
                        </button>
                    </div>
                    {message && (
                        <p className="text-[12px] text-center mt-2 text-error">
                            {message}
                        </p>
                    )}
                </div>

                {/* Footer note */}
                <p className="text-blue-muted text-xs text-center mt-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </main>
    )
}
