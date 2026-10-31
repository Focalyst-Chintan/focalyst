import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export type Level = "info" | "warn" | "error";

// Stage names, durations, counts and errors only. Never prompts or secrets.
export async function log(fn: string, level: Level, message: string, data?: Record<string, unknown>) {
  console.log(`[${fn}] ${level}: ${message}`);
  await db().from("blog_log").insert({ fn, level, message: message.slice(0, 1000), data: data ?? null });
}

export interface BlogConfig {
  enabled: boolean;
  auto_publish: boolean;
  model_research: string;
  model_writer: string;
  min_words: number;
  max_words: number;
  max_launch_posts_per_day: number;
  site_url: string;
  author: string;
  weekday_pillars: Record<string, string>;
}

export async function getConfig(): Promise<BlogConfig> {
  const { data, error } = await db().from("blog_config").select("*").eq("id", true).single();
  if (error || !data) throw new Error(`blog_config: ${error?.message ?? "missing"}`);
  return data as BlogConfig;
}

export interface Feature {
  key: string;
  name: string;
  platforms: string[];
  plan: string;
  facts: string;
  guide_slug: string | null;
}

export async function getFeatures(): Promise<Feature[]> {
  const { data } = await db().from("blog_features").select("key,name,platforms,plan,facts,guide_slug").eq("active", true);
  return (data ?? []) as Feature[];
}
