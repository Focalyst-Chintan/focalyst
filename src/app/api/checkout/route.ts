import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Polar } from "@polar-sh/sdk";

export async function GET(req: NextRequest) {
    try {
        // 1. Strict Environment Variable Check
        const token = process.env.POLAR_ACCESS_TOKEN;
        if (!token) {
            console.error("CRITICAL: POLAR_ACCESS_TOKEN is undefined in the environment.");
            return NextResponse.json({ error: "Missing Environment Variable" }, { status: 500 });
        }

        // 2. Initialize Polar for PRODUCTION (Removing sandbox flag)
        const polar = new Polar({
            accessToken: token,
        });

        const url = new URL(req.url);
        const productId = url.searchParams.get("productId");

        if (!productId) {
            return NextResponse.json({ error: "Missing productId" }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // 3. Create Checkout
        const result = await polar.checkouts.create({
            products: [productId],
            successUrl: process.env.POLAR_SUCCESS_URL || `${url.origin}/plan?payment=success`,
            customerEmail: user.email,
            metadata: {
                user_id: user.id,
            },
        });

        return NextResponse.redirect(result.url);

    } catch (error: any) {
        console.error("Polar Checkout Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
