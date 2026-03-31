import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'

// Map Polar product IDs to plan types
function getPlanType(productId: string): 'pro_monthly' | 'pro_yearly' | 'lifetime' | null {
    if (productId === process.env.POLAR_PRODUCT_ID_MONTHLY) return 'pro_monthly'
    if (productId === process.env.POLAR_PRODUCT_ID_YEARLY) return 'pro_yearly'
    if (productId === process.env.POLAR_PRODUCT_ID_LIFETIME) return 'lifetime'
    return null
}

// Convert USD to paise-equivalent for consistency (stored as cents × 100)
function usdToPaise(amountCents: number): number {
    return amountCents // Store cents directly for USD
}

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const computedSig = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const signature = request.headers.get('webhook-signature') ||
            request.headers.get('x-polar-signature') || ''

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }

        // Verify webhook signature
        const secret = process.env.POLAR_WEBHOOK_SECRET!
        if (secret !== 'REPLACE_ME_FROM_POLAR_DASHBOARD') {
            const isValid = verifyWebhookSignature(body, signature, secret)
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
            }
        }

        const event = JSON.parse(body)
        const eventType = event.type as string

        const supabase = createAdminClient()

        // ─── Subscription Created ───────────────────────────────────
        if (eventType === 'subscription.created' || eventType === 'subscription.active') {
            const subscription = event.data
            const userId = subscription.customer_metadata?.user_id ||
                subscription.metadata?.user_id

            if (!userId) {
                console.error('Missing user_id in Polar subscription metadata')
                return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
            }

            const productId = subscription.product_id || subscription.product?.id
            const planType = productId ? getPlanType(productId) : null

            if (!planType || planType === 'lifetime') {
                console.error('Invalid plan type for subscription:', productId)
                return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
            }

            const now = new Date()
            const expiresAt = new Date(now)
            if (planType === 'pro_monthly') {
                expiresAt.setMonth(expiresAt.getMonth() + 1)
            } else {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1)
            }

            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan: planType,
                status: 'active',
                provider: 'polar',
                polar_subscription_id: subscription.id,
                amount_paise: usdToPaise(subscription.amount || 0),
                currency: 'USD',
                started_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
            })

            await supabase.from('users').update({
                plan: planType,
                plan_expires_at: expiresAt.toISOString(),
            }).eq('id', userId)

            return NextResponse.json({ status: 'ok' })
        }

        // ─── Order Created (Lifetime) ───────────────────────────────
        if (eventType === 'order.created' || eventType === 'order.paid') {
            const order = event.data
            const userId = order.customer_metadata?.user_id ||
                order.metadata?.user_id

            if (!userId) {
                console.error('Missing user_id in Polar order metadata')
                return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
            }

            const productId = order.product_id || order.product?.id
            const planType = productId ? getPlanType(productId) : 'lifetime'

            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan: planType || 'lifetime',
                status: 'active',
                provider: 'polar',
                polar_order_id: order.id,
                amount_paise: usdToPaise(order.amount || 0),
                currency: 'USD',
                started_at: new Date().toISOString(),
                expires_at: null,
            })

            await supabase.from('users').update({
                plan: planType || 'lifetime',
                plan_expires_at: null,
            }).eq('id', userId)

            return NextResponse.json({ status: 'ok' })
        }

        // Unhandled event – acknowledge
        return NextResponse.json({ status: 'ignored' })

    } catch (error) {
        console.error('Polar webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
