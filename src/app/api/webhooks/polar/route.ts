import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Webhook } from "@polar-sh/sdk/webhooks";

// Initialize Supabase Admin client with Service Role Key to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

const PRODUCT_ID_MAP: Record<string, string> = {
    "8031aece-1aa2-4556-87b9-cc1122f18511": "pro_monthly",
    "dd474007-da78-4349-a858-e30ed36004c4": "pro_yearly",
    "93cd36bb-5d93-42be-94d8-f4186b5d1473": "lifetime",
};

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("polar-signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    try {
        // Verify Webhook Signature
        const webhookPayload = Webhook.verify(
            body,
            signature,
            process.env.POLAR_WEBHOOK_SECRET!
        ) as any;

        const event = webhookPayload.type;
        const data = webhookPayload.data;
        const metadata = data.metadata || {};
        const userId = metadata.user_id;

        if (!userId) {
            console.warn("Webhook received without user_id in metadata:", event);
            return NextResponse.json({ message: "No user_id in metadata" }, { status: 200 });
        }

        console.log(`Processing Polar webhook event: ${event} for user: ${userId}`);

        if (event === "subscription.created" || event === "subscription.updated") {
            const productId = data.product_id;
            const plan = PRODUCT_ID_MAP[productId];

            if (plan) {
                const expiresAt = data.current_period_end
                    ? new Date(data.current_period_end).toISOString()
                    : null;

                // Update User Plan
                await supabaseAdmin
                    .from("users")
                    .update({
                        plan,
                        plan_expires_at: expiresAt,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", userId);

                // Log Subscription (Idempotent using upsert if table has unique constraint or just insert)
                await supabaseAdmin.from("subscriptions").insert({
                    user_id: userId,
                    plan,
                    status: data.status === "active" ? "active" : "pending",
                    polar_subscription_id: data.id,
                    amount_paise: data.amount || 0,
                    currency: data.currency || "INR",
                    started_at: new Date(data.started_at || Date.now()).toISOString(),
                    expires_at: expiresAt,
                });
            }
        } else if (event === "order.created") {
            const productId = data.product_id;
            const plan = PRODUCT_ID_MAP[productId];

            if (plan === "lifetime") {
                // Update User Plan to Lifetime
                await supabaseAdmin
                    .from("users")
                    .update({
                        plan: "lifetime",
                        plan_expires_at: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", userId);

                // Log Lifetime Order
                await supabaseAdmin.from("subscriptions").insert({
                    user_id: userId,
                    plan: "lifetime",
                    status: "active",
                    polar_order_id: data.id,
                    amount_paise: data.amount || 0,
                    currency: data.currency || "INR",
                    started_at: new Date().toISOString(),
                    expires_at: null,
                });
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
        console.error("Webhook Verification Error:", error.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
}
