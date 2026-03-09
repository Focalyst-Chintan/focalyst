import CountdownForm from '@/components/focus/CountdownForm'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditCountdownPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    const { data: user } = await supabase.from('users').select('plan').eq('id', session.user.id).single()

    return (
        <div className="min-h-screen bg-page-bg">
            <CountdownForm id={id} userPlan={user?.plan || 'free'} userId={session.user.id} />
        </div>
    )
}
