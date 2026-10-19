'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { UserPlan } from '@/lib/featureGates'
import { User, Session } from '@supabase/supabase-js'

interface UserProfile {
    full_name?: string | null;
    name?: string | null;
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
            .select('plan, ai_message_count, last_message_date, full_name, name')
            .eq('id', currentUser.id)
            .single()

        if (error) {
            // Retry selecting without name if name column does not exist
            const fallback = await supabase
                .from('users')
                .select('plan, ai_message_count, last_message_date, full_name')
                .eq('id', currentUser.id)
                .single()
            if (!fallback.error && fallback.data) {
                setProfile({ full_name: fallback.data.full_name })
                setPlan(fallback.data.plan || 'free')
                setAiMessageCount(fallback.data.ai_message_count || 0)
                setLastMessageDate(fallback.data.last_message_date || null)
                return
            }
            console.error('Failed to fetch user profile:', error)
            return
        }

        setProfile({ full_name: data?.full_name, name: data?.name })
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
                        .select('plan, ai_message_count, last_message_date')
                        .eq('id', currentSession.user.id)
                        .single()
                    if (profileError) {
                        console.error('Failed to fetch user profile:', profileError)
                    } else {
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
