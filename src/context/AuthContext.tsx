'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { UserPlan } from '@/lib/featureGates'
import { User, Session } from '@supabase/supabase-js'
import { useData } from '@/lib/data/useData'
import { useSWRConfig } from 'swr'

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

// User-specific Context (Session & User Auth)
interface UserAuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

// Profile & Plan Context
interface ProfileContextType {
    profile: UserProfile | null;
    plan: UserPlan;
    aiMessageCount: number;
    lastMessageDate: string | null;
    refreshUserProfile: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    plan: 'free',
    aiMessageCount: 0,
    lastMessageDate: null,
    refreshUserProfile: async () => { },
});

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
    const { mutate } = useSWRConfig()

    const profileFetcher = useCallback(async () => {
        const currentUser = user || session?.user
        if (!currentUser) return null

        const { data, error } = await supabase
            .from('users')
            .select('plan, plan_expires_at, ai_message_count, last_message_date, full_name, total_xp, current_level, current_title')
            .eq('id', currentUser.id)
            .single()

        if (error) {
            console.error('Failed to fetch user profile:', error)
            throw error
        }
        return data
    }, [user, session?.user])

    const { data: cachedProfile, mutate: mutateProfile } = useData(
        (user?.id || session?.user?.id) ? `profile:${user?.id || session?.user?.id}` : null,
        profileFetcher
    )

    useEffect(() => {
        if (cachedProfile) {
            setProfile({
                full_name: cachedProfile.full_name,
                total_xp: cachedProfile.total_xp || 0,
                current_level: cachedProfile.current_level || 1,
                current_title: cachedProfile.current_title || 'Ignition',
            })
            setPlan(cachedProfile.plan || 'free')
            setAiMessageCount(cachedProfile.ai_message_count || 0)
            setLastMessageDate(cachedProfile.last_message_date || null)
        }
    }, [cachedProfile])

    const refreshUserProfile = React.useCallback(async () => {
        const currentUser = user || session?.user
        if (!currentUser) {
            setProfile(null)
            setPlan('free')
            setAiMessageCount(0)
            setLastMessageDate(null)
            return
        }
        await mutateProfile()
    }, [user, session?.user, mutateProfile])

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

    const signOut = React.useCallback(async () => {
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
    }, [])

    const userAuthValue = React.useMemo(() => ({
        user,
        session,
        isLoading,
        signOut,
    }), [user, session, isLoading, signOut])

    const profileValue = React.useMemo(() => ({
        profile,
        plan,
        aiMessageCount,
        lastMessageDate,
        refreshUserProfile,
    }), [profile, plan, aiMessageCount, lastMessageDate, refreshUserProfile])

    const combinedAuthValue = React.useMemo(() => ({
        user,
        session,
        profile,
        isLoading,
        plan,
        aiMessageCount,
        lastMessageDate,
        refreshUserProfile,
        signOut,
    }), [user, session, profile, isLoading, plan, aiMessageCount, lastMessageDate, refreshUserProfile, signOut])

    return (
        <UserAuthContext.Provider value={userAuthValue}>
            <ProfileContext.Provider value={profileValue}>
                <AuthContext.Provider value={combinedAuthValue}>
                    {children}
                </AuthContext.Provider>
            </ProfileContext.Provider>
        </UserAuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}

export function useUser() {
    return useContext(UserAuthContext)
}

export function useProfile() {
    return useContext(ProfileContext)
}
