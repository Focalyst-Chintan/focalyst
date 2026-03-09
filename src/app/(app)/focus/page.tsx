import PomodoroSection from '@/components/focus/PomodoroSection'
import CountdownSection from '@/components/focus/CountdownSection'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FocusPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect('/login')
    }

    const { data: user } = await supabase
        .from('users')
        .select('plan')
        .eq('id', session.user.id)
        .single()

    const userPlan = user?.plan || 'free'

    return (
        <div className="min-h-screen pb-24 bg-page-bg">
            <main className="max-w-md mx-auto p-4 pt-6">
                <PomodoroSection userPlan={userPlan} />
                <CountdownSection userPlan={userPlan} userId={session.user.id} />
            </main>
        </div>
    )
}
