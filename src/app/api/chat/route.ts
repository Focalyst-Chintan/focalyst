import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStartAndEndOfWeek } from '@/lib/utils/insights';
import { streamText, tool, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { FREE_TIER_LIMITS, dateKeyFromSupabase, localDateKey } from '@/lib/featureGates';
import { rateLimit } from '@/lib/rate-limit';
import { FOCALYST_AI_PERSONA } from '@/constants/focalystPersona';

// CRITICAL: Set Edge Runtime to allow streaming in Vercel production
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!rateLimit(ip, 20, 60000)) {
            return NextResponse.json({ error: 'Too many requests. Please wait a minute before sending more messages.' }, { status: 429 });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('[CHAT_API_ERROR] GEMINI_API_KEY is missing');
            return NextResponse.json({ error: "API key is missing" }, { status: 500 });
        }

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        const boundedMessages = messages.slice(-10);
        const normalizedMessages = boundedMessages.map((msg: any) => {
            let textContent = "";
            
            // Handle standard SDK format
            if (typeof msg.content === "string") {
                textContent = msg.content;
            } 
            // Handle the rogue 'parts' format coming from the frontend
            else if (Array.isArray(msg.parts)) {
                textContent = msg.parts.map((p: any) => p.text).join(" ");
            }

            if (textContent.length > 3000) {
                textContent = textContent.slice(0, 3000) + '... [truncated for length]';
            }

            return {
                role: msg.role,
                content: textContent || " " // Fallback to prevent undefined crashes
            };
        });

        // ── Auth: try Bearer token first (Capacitor), fall back to cookie-based session (web) ──
        let user: any = null;
        let supabase: any = null;
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

        if (token) {
            try {
                // In Capacitor native WebView, cookies are not reliable or stripped, so we use
                // the Bearer token passed in the Authorization header to authenticate the user.
                // We create a server client passing the token globally to ensure all subsequent
                // database queries satisfy RLS policies for that specific user.
                const { createServerClient } = await import('@supabase/ssr');
                supabase = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    {
                        cookies: {
                            getAll() { return []; },
                            setAll() {}
                        },
                        global: {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    }
                );
                const { data: { user: jwtUser } } = await supabase.auth.getUser(token);
                user = jwtUser;
            } catch (bearerErr) {
                console.error('[CHAT_API] Bearer token auth failed:', bearerErr);
            }
        }

        if (!user) {
            // Cookie-based auth fallback
            try {
                supabase = await createServerSupabaseClient();
                const { data: { user: cookieUser } } = await supabase.auth.getUser();
                user = cookieUser;
            } catch (cookieErr) {
                console.warn('[CHAT_API] Cookie-based auth unavailable:', cookieErr);
            }
        }

        if (!user) {
            // ALWAYS return JSON here — never let Next.js return an HTML redirect
            return NextResponse.json(
                { error: 'Unauthorized: session expired or missing. Please sign out and sign back in.' },
                { status: 401 }
            );
        }

        // Database Atomic Quota Verification
        const { data: quotaResult, error: quotaError } = await supabase.rpc('check_and_increment_ai_quota', {
            p_action_type: 'chat'
        });

        if (quotaResult && quotaResult.allowed === false) {
            return NextResponse.json(
                { error: quotaResult.message || 'Daily limit reached. Please try again tomorrow.' },
                { status: 429 }
            );
        }

        // 1. Check User Plan & Limits (Secondary fallback / plan metadata)
        const { data: userData } = await supabase
            .from('users')
            .select('plan, ai_message_count, last_message_date')
            .eq('id', user.id)
            .single();

        const isFree = userData?.plan === 'free';
        const newUserMessage = normalizedMessages[normalizedMessages.length - 1];
        let currentMessageCount = userData?.ai_message_count || 0;

        if (isFree) {
            const todayKey = localDateKey();
            const lastKey = dateKeyFromSupabase(userData?.last_message_date);

            if (lastKey !== todayKey) {
                currentMessageCount = 0;
                await supabase
                    .from('users')
                    .update({
                        ai_message_count: 0,
                        last_message_date: new Date().toISOString(),
                    })
                    .eq('id', user.id);
            }

            if (currentMessageCount >= FREE_TIER_LIMITS.aiMessagesPerDay) {
                return NextResponse.json(
                    { error: 'Daily limit reached. Upgrade to Pro for unlimited AI chat.' },
                    { status: 429 }
                );
            }
        }

        // 2. Log User Message for Usage Tracking
        if (newUserMessage && newUserMessage.role === 'user') {
            await supabase.from('ai_chat_logs').insert([
                {
                    user_id: user.id,
                    role: 'user',
                    content: typeof newUserMessage.content === 'string' ? newUserMessage.content : JSON.stringify(newUserMessage.content),
                }
            ]);
        }

        // Prepare System Instructions with full ai_persona.md specification
        const systemInstruction = 
            `${FOCALYST_AI_PERSONA}\n\n` +
            "## Tool Execution Rules\n" +
            "**Rule 1 - Analysis:** Use the `readStats` tool to analyze the user's focus time and task completion when they ask about their progress. \n" +
            "**Rule 2 - Notes:** Use the `readNotes` tool to look up details about their projects, thoughts, or summaries when relevant. \n" +
            "**Rule 3 - Science:** Quote behavioral psychology and frameworks (e.g., Deep Work, Atomic Habits) to explain advice. \n" +
            "**Rule 4 - Persistence:** If the user asks to add a task, use the `addTask` tool. \n" +
            "Format strictly in highly scannable Markdown. Never explicitly say you are calling a tool unless confirming a result.";

        // Per-request in-memory cache for stats tool
        let cachedStatsThisTurn: any = null;

        // 3. Use streamText for AI SDK v3+ Streaming
        try {
            // @ts-ignore
            const result = streamText({
                model: google('gemini-3.8-flash'),
                system: systemInstruction,
                messages: normalizedMessages,
                stopWhen: stepCountIs(5),
                tools: {
                    readNotes: tool({
                        description: "Fetches the user's most recent notes from their database.",
                        parameters: z.object({
                            limit: z.number().optional().describe("Number of notes to fetch (max 3)"),
                            searchQuery: z.string().optional().describe("Optional search term to filter notes")
                        }),
                        // @ts-ignore
                        execute: async ({ limit, searchQuery }: { limit?: number, searchQuery?: string }) => {
                            const finalLimit = Math.min(limit || 3, 3); // AGGRESSIVE: max 3 notes

                            try {
                                let query = supabase
                                    .from('notes')
                                    .select('title, content, created_at')
                                    .eq('user_id', user.id)
                                    .order('created_at', { ascending: false })
                                    .limit(finalLimit);

                                if (searchQuery) {
                                    query = query.ilike('content', `%${searchQuery}%`);
                                }

                                const { data: notes, error: notesError } = await query;

                                if (notesError) throw new Error(notesError.message);

                                if (!notes || notes.length === 0) {
                                    return { success: true, notes: [], message: "No notes found." };
                                }

                                const sanitizedNotes = notes.map((n: any) => ({
                                    title: n.title,
                                    content: (n.content || "").substring(0, 500), // AGGRESSIVE: max 500 chars
                                    date: new Date(n.created_at).toLocaleDateString()
                                }));

                                return sanitizedNotes;
                            } catch (error: any) {
                                console.error("[TOOL ERROR]:", error);
                                return { success: false, error: "Database access failed. Tell the user you cannot read their data right now." };
                            }
                        }
                    }),
                    readStats: tool({
                        description: "Gathers productivity stats for the current week (focus time, tasks, habits).",
                        parameters: z.object({}),
                        // @ts-ignore
                        execute: async () => {
                            if (cachedStatsThisTurn) {
                                return cachedStatsThisTurn;
                            }

                            try {
                                const today = new Date();
                                const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(today);
                                const startStr = startOfWeek.toISOString().split('T')[0];
                                const endStr = endOfWeek.toISOString().split('T')[0];

                                const [focusRes, tasksRes, habitsRes] = await Promise.all([
                                    supabase.from('daily_focus_activity').select('focus_time_minutes').eq('user_id', user.id).gte('date', startStr).lte('date', endStr),
                                    supabase.from('tasks').select('is_completed, completed_at').eq('user_id', user.id),
                                    supabase.from('habits').select('name, current_streak').eq('user_id', user.id).eq('is_active', true)
                                ]);

                                if (focusRes.error) throw new Error(focusRes.error.message);
                                if (tasksRes.error) throw new Error(tasksRes.error.message);
                                if (habitsRes.error) throw new Error(habitsRes.error.message);

                                const focusTime = focusRes.data?.reduce((acc: number, curr: any) => acc + (curr.focus_time_minutes || 0), 0) || 0;

                                const completedThisWeek = tasksRes.data?.filter((t: any) =>
                                    t.is_completed && t.completed_at && new Date(t.completed_at) >= startOfWeek && new Date(t.completed_at) <= endOfWeek
                                ).length || 0;

                                const pendingTasks = tasksRes.data?.filter((t: any) => !t.is_completed).length || 0;

                                const habitStr = habitsRes.data?.map((h: any) => `${h.name} (${h.current_streak} days)`).join(', ') || 'None';

                                cachedStatsThisTurn = {
                                    success: true,
                                    stats: {
                                        focusTimeMinutes: focusTime,
                                        weeklyTasksCompleted: completedThisWeek,
                                        totalPendingTasks: pendingTasks,
                                        activeHabitStreaks: habitStr
                                    }
                                };
                                return cachedStatsThisTurn;
                            } catch (error: any) {
                                console.error("[TOOL ERROR]:", error);
                                return { success: false, error: "Database access failed. Tell the user you cannot read their data right now." };
                            }
                        }
                    }),
                    addTask: tool({
                        description: "Adds a new task to the user's to-do list.",
                        parameters: z.object({
                            title: z.string().describe("Task title"),
                            dueDate: z.string().optional().describe("Date in YYYY-MM-DD format")
                        }),
                        // @ts-ignore
                        execute: async ({ title, dueDate }: { title: string, dueDate?: string }) => {

                            try {
                                const { error: taskError } = await supabase.from('tasks').insert({
                                    user_id: user.id,
                                    title: title,
                                    due_date: dueDate || null,
                                    priority: 'medium'
                                });

                                if (taskError) throw new Error(taskError.message);

                                return { success: true, message: `Task "${title}" added.` };
                            } catch (error: any) {
                                console.error("[TOOL ERROR]:", error);
                                return { success: false, error: "Database access failed. Tell the user you cannot read their data right now." };
                            }
                        }
                    })
                }
            } as any);

            if (isFree) {
                await supabase
                    .from('users')
                    .update({
                        ai_message_count: currentMessageCount + 1,
                        last_message_date: new Date().toISOString(),
                    })
                    .eq('id', user.id);
            }

            return result.toTextStreamResponse();
        } catch (streamingError: any) {
            console.error('[AI_GENERATION_ERROR]', streamingError);
            
            // Check for quota or rate limit errors
            if (streamingError.message?.toLowerCase().includes('quota') || streamingError.message?.toLowerCase().includes('429')) {
                return NextResponse.json(
                    { error: "AI API rate limit exceeded. Please wait a minute and try again." },
                    { status: 429 }
                );
            }
            
            throw streamingError; // Let the outer catch handle unexpected errors
        }

    } catch (error: any) {
        const correlationId = crypto.randomUUID();
        console.error(`[CHAT_API_ERROR] [${correlationId}]`, error?.message || 'Unknown error');
        
        return NextResponse.json(
            { error: 'Internal Server Error', correlationId },
            { status: 500 }
        );
    }
}
