'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'

export default function CountdownForm({ id, userPlan, userId }: { id?: string, userPlan: string, userId: string }) {
    const { user } = useAuth()
    const isFree = userPlan === 'free'
    const router = useRouter()
    const supabase = createClient()

    const [eventName, setEventName] = useState('')
    const [targetDate, setTargetDate] = useState('')
    const [getReminders, setGetReminders] = useState(false)
    const [loading, setLoading] = useState(id ? true : false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) {
            const fetchCountdown = async () => {
                const { data, error } = await supabase
                    .from('countdowns')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (data) {
                    setEventName(data.event_name)
                    setTargetDate(data.target_date)
                    // if reminder toggles are in schema, we would set it. but schema only has "icon", "color", "is_active", etc. So we just simulate it.
                }
                setLoading(false)
            }
            fetchCountdown()
        }
    }, [id, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)

        if (!eventName || !targetDate) {
            setError('Please fill all fields')
            setSubmitting(false)
            return
        }

        // Forcefully await a fresh session immediately to update headers and prevent RLS failures
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id || user?.id || userId

        if (!currentUserId) {
            setError('User is not authenticated')
            setSubmitting(false)
            return
        }

        // Feature Limits
        if (isFree && !id) {
            // Check count limit
            const { count } = await supabase
                .from('countdowns')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUserId)
                .eq('is_active', true)

            if (count !== null && count >= FREE_TIER_LIMITS.countdowns) {
                router.push('/paywall')
                setSubmitting(false)
                return
            }
        }

        if (isFree) {
            // Check date limit
            const today = new Date()
            const target = new Date(targetDate)
            const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (diffDays > 30) {
                router.push('/paywall')
                setSubmitting(false)
                return
            }
        }

        const payload = {
            user_id: currentUserId,
            event_name: eventName,
            target_date: targetDate,
            is_active: true
        }

        if (id) {
            const { error: updateError } = await supabase.from('countdowns').update(payload).eq('id', id)
            if (updateError) setError(updateError.message)
            else router.push('/focus')
        } else {
            // Explicitly pass payload mapped inside an array for RLS insert policy alignment
            const { error: insertError } = await supabase.from('countdowns').insert([payload])
            if (insertError) setError(insertError.message)
            else router.push('/focus')
        }

        setSubmitting(false)
    }

    if (loading) return <div className="p-4 text-center">Loading...</div>

    return (
        <form onSubmit={handleSubmit} className="p-4 pt-6 max-w-md mx-auto">
            <h1 className="text-[28px] font-bold text-navy mb-6">{id ? 'Edit countdown' : 'New countdown'}</h1>

            {error && <div className="text-error bg-error-light p-3 rounded-xl text-sm mb-4">{error}</div>}

            <div className="mb-4">
                <label className="block text-navy font-semibold text-lg mb-2">Describe</label>
                <input
                    type="text"
                    placeholder="Give it a name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full bg-card-bg/50 rounded-xl p-4 text-navy outline-none"
                    required
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full mb-6">
                <div className="w-full">
                    <label className="block text-navy font-semibold text-lg mb-2">Date</label>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full bg-card-bg/50 rounded-xl p-3 text-navy outline-none text-sm"
                        required
                    />
                </div>
                <div className="w-full">
                    <label className="block text-navy font-semibold text-lg mb-2">Time</label>
                    <input
                        type="time"
                        defaultValue="11:00"
                        className="w-full bg-card-bg/50 rounded-xl p-3 text-navy outline-none text-sm"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="text-navy font-semibold text-lg">Get reminders</div>
                {/* Toggle switch */}
                <button
                    type="button"
                    onClick={() => setGetReminders(!getReminders)}
                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${getReminders ? 'bg-navy' : 'bg-card-bg/50'}`}
                >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${getReminders ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent text-white font-bold py-4 rounded-xl active:scale-95 transition-transform"
            >
                {submitting ? 'Saving...' : 'Save'}
            </button>
        </form>
    )
}
