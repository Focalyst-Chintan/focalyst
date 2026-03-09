'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function joinWaitlist(plan: string) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: "Not authenticated" }
        }

        const { error } = await supabase.from("waitlist").insert({
            user_id: user.id,
            email: user.email,
            plan_interest: plan,
        })

        if (error) {
            // Handle duplicate entries gracefully
            if (error.code === "23505") {
                return { success: true, message: "Already on the waitlist" }
            }
            console.error("Waitlist insert error:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error("joinWaitlist error:", err)
        return { success: false, error: err.message }
    }
}
