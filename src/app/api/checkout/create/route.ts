import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { Polar } from '@polar-sh/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Razorpay plan IDs – set these in your Razorpay dashboard
const RAZORPAY_PLAN_IDS = {
    monthly: process.env.RAZORPAY_PLAN_ID_MONTHLY || '',
    yearly: process.env.RAZORPAY_PLAN_ID_YEARLY || '',
}

// Polar product IDs – set these from your Polar dashboard
const POLAR_PRODUCT_IDS = {
    monthly: process.env.POLAR_PRODUCT_ID_MONTHLY || '',
    yearly: process.env.POLAR_PRODUCT_ID_YEARLY || '',
    lifetime: process.env.POLAR_PRODUCT_ID_LIFETIME || '',
}

// INR pricing (in paise)
const INR_PRICES = {
    monthly: 9900,    // ₹99
    yearly: 99900,    // ₹999
    lifetime: 299900, // ₹2,999
}

export async function POST(request: NextRequest) {
    // 1. Safe JSON Parsing
    let body: any;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { planType, region, isOnboarding } = body as {
        planType: 'monthly' | 'yearly' | 'lifetime'
        region: 'IN' | 'INT'
        isOnboarding?: boolean
    }

    if (!planType || !region) {
        return NextResponse.json({ error: "Missing planType or region in request" }, { status: 400 });
    }

    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ─── India → Razorpay ───────────────────────────────────────
        if (region === 'IN') {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID!,
                key_secret: process.env.RAZORPAY_KEY_SECRET!,
            })

            if (planType === 'lifetime') {
                const order = await razorpay.orders.create({
                    amount: INR_PRICES.lifetime,
                    currency: 'INR',
                    notes: {
                        user_id: user.id,
                        plan_type: 'lifetime',
                    },
                })

                return NextResponse.json({
                    provider: 'razorpay',
                    type: 'order',
                    orderId: order.id,
                    amount: INR_PRICES.lifetime,
                    currency: 'INR',
                    keyId: process.env.RAZORPAY_KEY_ID,
                })
            }

            const subscriptionPayload = {
                plan_id: RAZORPAY_PLAN_IDS[planType],
                total_count: planType === 'monthly' ? 12 : 5,
                notes: {
                    user_id: user.id,
                    plan_type: planType,
                },
                ...(planType === 'monthly' ? {
                    start_at: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
                } : {}),
            }

            const subscription = await razorpay.subscriptions.create(subscriptionPayload)

            return NextResponse.json({
                provider: 'razorpay',
                type: 'subscription',
                subscriptionId: subscription.id,
                keyId: process.env.RAZORPAY_KEY_ID,
            })
        }

        // ─── International → Polar ──────────────────────────────────
        // 2. Validate Polar Access Token
        if (!process.env.POLAR_ACCESS_TOKEN) {
            return NextResponse.json({ error: "Missing Polar Access Token" }, { status: 500 });
        }

        const polar = new Polar({
            accessToken: process.env.POLAR_ACCESS_TOKEN
        })

        // 3. Null Check the Product ID
        const productId = POLAR_PRODUCT_IDS[planType]
        if (!productId) {
            return NextResponse.json({ error: `Server Configuration Error: Missing Product ID for plan ${planType}` }, { status: 500 });
        }

        // 4. Null Check the Success URL
        if (!process.env.POLAR_SUCCESS_URL) {
            return NextResponse.json({ error: "Missing Polar Success URL" }, { status: 500 });
        }

        // Determine success URL based on onboarding context
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://focalyst.online'
        const polarSuccessUrl = isOnboarding
            ? `${baseUrl}/onboarding/name?payment=success&checkout_id={CHECKOUT_ID}`
            : (process.env.POLAR_SUCCESS_URL || `${baseUrl}/plan?payment=success&checkout_id={CHECKOUT_ID}`)

        try {
            const checkoutSession = await polar.checkouts.create({
                products: [productId],
                successUrl: polarSuccessUrl,
                customerMetadata: {
                    userId: user.id,
                },
            })

            if (!checkoutSession || !checkoutSession.url) {
                return NextResponse.json({ error: 'Polar checkout failed to generate URL' }, { status: 500 })
            }

            return NextResponse.json({
                provider: 'polar',
                type: planType === 'lifetime' ? 'order' : 'subscription',
                url: checkoutSession.url,
                checkoutUrl: checkoutSession.url,
            })
        } catch (polarError: any) {
            return NextResponse.json({ error: polarError.message || "Failed to create Polar session" }, { status: 500 })
        }

    } catch (error: any) {
        console.error('Checkout error:', error)
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
    }
}
