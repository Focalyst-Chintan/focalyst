'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { UserPlan } from '@/lib/featureGates'
import { User, Session } from '@supabase/supabase-js'

interface UserProfile {
    full_name?: string | null;
    total_xp?: number | null;
    current_level?: number | null;
    current_title?: string | null;
}

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: UserProfile | null
    isLoading: boolean
    plan: UserPlan
    aiMessageCount: number
    lastMessageDate: string | null
    refreshUserProfile: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    plan: 'free',
    aiMessageCount: 0,
    lastMessageDate: null,
    refreshUserProfile: async () => { },
    signOut: async () => { }
})

// Singleton Supabase client — created once outside the component to prevent
// a new reference on every render, which would re-trigger any useEffect that
// lists it as a dependency.
const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [plan, setPlan] = useState<UserPlan>('free')
    const [aiMessageCount, setAiMessageCount] = useState(0)
    const [lastMessageDate, setLastMessageDate] = useState<string | null>(null)

    // Guard: ensure the init effect fires exactly once, even in React StrictMode.
    const didInit = useRef(false)

    const refreshUserProfile = async () => {
        const currentUser = user || session?.user
        if (!currentUser) {
            setProfile(null)
            setPlan('free')
            setAiMessageCount(0)
            setLastMessageDate(null)
            return
        }

        const { data, error } = await supabase
            .from('users')
            .select('plan, plan_expires_at, ai_message_count, last_message_date, full_name, total_xp, current_level, current_title')
            .eq('id', currentUser.id)
            .single()

        if (error) {
            console.error('Failed to fetch user profile:', error)
            return
        }

        setProfile({
            full_name: data?.full_name,
            total_xp: data?.total_xp || 0,
            current_level: data?.current_level || 1,
            current_title: data?.current_title || 'Ignition',
        })
        setPlan(data?.plan || 'free')
        setAiMessageCount(data?.ai_message_count || 0)
        setLastMessageDate(data?.last_message_date || null)
    }

    useEffect(() => {
        if (didInit.current) return
        didInit.current = true

        // Initialize Auth session — runs ONCE on mount.
        async function initializeSession() {
            try {
                // Safety 3-second timeout race to ensure loading spinner does not get stuck
                const sessionPromise = supabase.auth.getSession()
                const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
                    setTimeout(() => reject(new Error('Auth session resolution timed out')), 3000)
                )

                const result = await Promise.race([sessionPromise, timeoutPromise])
                const currentSession = result?.data?.session || null
                const error = (result as any)?.error || null

                if (error) {
                    console.error('Failed to get Supabase session:', error)
                }
                if (currentSession) {
                    setSession(currentSession)
                    setUser(currentSession.user)
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('plan, ai_message_count, last_message_date, total_xp, current_level, current_title, full_name')
                        .eq('id', currentSession.user.id)
                        .single()
                    if (profileError) {
                        console.error('Failed to fetch user profile:', profileError)
                    } else {
                        setProfile({
                            full_name: profile?.full_name,
                            total_xp: profile?.total_xp || 0,
                            current_level: profile?.current_level || 1,
                            current_title: profile?.current_title || 'Ignition',
                        })
                        setPlan(profile?.plan || 'free')
                        setAiMessageCount(profile?.ai_message_count || 0)
                        setLastMessageDate(profile?.last_message_date || null)
                    }
                }
            } catch (err) {
                console.error('Supabase getSession exception:', err)
            } finally {
                setIsLoading(false)
            }
        }
        initializeSession()

        // Auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, currentSession: any) => {
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            if (!currentSession?.user) {
                setPlan('free')
                setAiMessageCount(0)
                setLastMessageDate(null)
                return
            }
            // Don't touch isLoading here — it was already set to false by initializeSession.
            // Re-setting it would cause unnecessary re-renders in downstream consumers.
        })

        return () => {
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // ← EMPTY dependency array: strictly runs ONCE on mount.

    useEffect(() => {
        if (user) {
            refreshUserProfile()
        }

        const handleVisibilityOrFocus = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                refreshUserProfile()
            }
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('visibilitychange', handleVisibilityOrFocus)
            window.addEventListener('focus', handleVisibilityOrFocus)
        }

        let appStateCleanup: (() => void) | undefined
        const cap = typeof window !== 'undefined' ? (window as any).Capacitor : null
        if (cap?.Plugins?.App?.addListener) {
            cap.Plugins.App.addListener('appStateChange', (state: { isActive: boolean }) => {
                if (state.isActive) {
                    refreshUserProfile()
                }
            }).then((listener: any) => {
                appStateCleanup = () => listener?.remove?.()
            }).catch(() => {})
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('visibilitychange', handleVisibilityOrFocus)
                window.removeEventListener('focus', handleVisibilityOrFocus)
            }
            if (appStateCleanup) appStateCleanup()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    const signOut = async () => {
        setIsLoading(true)
        try {
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            setProfile(null)
            setPlan('free')
            setAiMessageCount(0)
            setLastMessageDate(null)
        } catch (err) {
            console.error('Signout failed:', err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, plan, aiMessageCount, lastMessageDate, refreshUserProfile, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
