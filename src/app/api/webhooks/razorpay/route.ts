import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'

// Map Razorpay plan_id env vars to plan types
function getPlanType(planId: string): 'pro_monthly' | 'pro_yearly' | null {
    if (planId === process.env.RAZORPAY_PLAN_ID_MONTHLY) return 'pro_monthly'
    if (planId === process.env.RAZORPAY_PLAN_ID_YEARLY) return 'pro_yearly'
    return null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const signature = request.headers.get('x-razorpay-signature')

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
            .update(body)
            .digest('hex')

        if (signature !== expectedSignature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const event = JSON.parse(body)
        const eventType = event.event as string
        const payload = event.payload

        const supabase = createAdminClient()

        // ─── Subscription Authenticated ─────────────────────────────
        if (eventType === 'subscription.authenticated') {
            const subscription = payload.subscription?.entity
            if (!subscription) {
                return NextResponse.json({ error: 'Missing subscription entity' }, { status: 400 })
            }

            const userId = subscription.notes?.user_id
            const planType = getPlanType(subscription.plan_id)

            if (!userId || !planType) {
                console.error('Missing user_id or invalid plan_id in subscription:', subscription.id)
                return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
            }

            // Calculate expiry
            const now = new Date()
            const expiresAt = new Date(now)
            if (planType === 'pro_monthly') {
                expiresAt.setMonth(expiresAt.getMonth() + 1)
            } else {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1)
            }

            // Upsert subscription record
            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan: planType,
                status: 'active',
                provider: 'razorpay',
                razorpay_signature: signature,
                amount_paise: planType === 'pro_monthly' ? 9900 : 99900,
                currency: 'INR',
                started_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
            })

            // Update user plan
            await supabase.from('users').update({
                plan: planType,
                plan_expires_at: expiresAt.toISOString(),
            }).eq('id', userId)

            return NextResponse.json({ status: 'ok' })
        }

        // ─── Order Paid (Lifetime) ──────────────────────────────────
        if (eventType === 'order.paid') {
            const order = payload.order?.entity
            const payment = payload.payment?.entity

            if (!order) {
                return NextResponse.json({ error: 'Missing order entity' }, { status: 400 })
            }

            const userId = order.notes?.user_id

            if (!userId) {
                console.error('Missing user_id in order:', order.id)
                return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
            }

            // Insert subscription record
            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan: 'lifetime',
                status: 'active',
                provider: 'razorpay',
                razorpay_signature: payment?.id || signature,
                amount_paise: order.amount,
                currency: 'INR',
                started_at: new Date().toISOString(),
                expires_at: null,
            })

            // Update user plan
            await supabase.from('users').update({
                plan: 'lifetime',
                plan_expires_at: null,
            }).eq('id', userId)

            return NextResponse.json({ status: 'ok' })
        }

        // Unhandled event type – acknowledge anyway
        return NextResponse.json({ status: 'ignored' })

    } catch (error) {
        console.error('Razorpay webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
