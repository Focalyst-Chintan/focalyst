import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStartAndEndOfWeek } from '@/lib/utils/insights';
import { streamText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// CRITICAL: Set Edge Runtime to allow streaming in Vercel production
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error('[CHAT_API_ERROR] GEMINI_API_KEY is missing');
            return new Response(JSON.stringify({ error: "API key is missing" }), { status: 500 });
        }

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // 1. Check User Plan & Limits
        const { data: userData } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .single();

        const isFree = userData?.plan === 'free';
        const newUserMessage = messages[messages.length - 1];

        if (isFree) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count } = await supabase
                .from('ai_chat_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('role', 'user')
                .gte('created_at', today.toISOString());

            if (count !== null && count >= 5) {
                return new Response(
                    JSON.stringify({ error: 'Daily limit reached. Upgrade to Pro for unlimited AI chat.' }),
                    { status: 403 }
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

        // Prepare System Instructions
        const systemInstruction = 
            "You are the Focalyst AI, an elite productivity coach and behavioral scientist. \n" +
            "**Rule 1 - Analysis:** Use the `readStats` tool to analyze the user's focus time and task completion when they ask about their progress. \n" +
            "**Rule 2 - Notes:** Use the `readNotes` tool to look up details about their projects, thoughts, or summaries when relevant. \n" +
            "**Rule 3 - Science:** Quote behavioral psychology and frameworks (e.g., Deep Work, Atomic Habits) to explain advice. \n" +
            "**Rule 4 - Persistence:** If the user asks to add a task, use the `addTask` tool. \n" +
            "Format strictly in highly scannable Markdown. Never explicitly say you are calling a tool unless confirming a result.";

        // 3. Use streamText for AI SDK v3+ Streaming
        try {
            const result = streamText({
                model: google('gemini-1.5-flash'),
                system: systemInstruction,
                messages: messages,
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
                            console.log(`[TOOL_CALL] readNotes: limit=${finalLimit}, query=${searchQuery}`);
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

                                if (notesError) throw notesError;

                                if (!notes || notes.length === 0) {
                                    return { success: true, notes: [], message: "No notes found." };
                                }

                                const sanitizedNotes = notes.map(n => ({
                                    title: n.title,
                                    content: (n.content || "").substring(0, 500), // AGGRESSIVE: max 500 chars
                                    date: new Date(n.created_at).toLocaleDateString()
                                }));

                                console.log(`[TOOL_DEBUG] readNotes payload size: ${JSON.stringify(sanitizedNotes).length} chars`);

                                return sanitizedNotes;
                            } catch (err) {
                                console.error('[TOOL_ERROR] readNotes:', err);
                                return { success: false, error: "Failed to fetch notes" };
                            }
                        }
                    }),
                    readStats: tool({
                        description: "Gathers productivity stats for the current week (focus time, tasks, habits).",
                        parameters: z.object({}),
                        // @ts-ignore
                        execute: async () => {
                            console.log(`[TOOL_CALL] readStats`);
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

                                const focusTime = focusRes.data?.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0) || 0;
                                
                                const completedThisWeek = tasksRes.data?.filter(t => 
                                    t.is_completed && t.completed_at && new Date(t.completed_at) >= startOfWeek && new Date(t.completed_at) <= endOfWeek
                                ).length || 0;
                                
                                const pendingTasks = tasksRes.data?.filter(t => !t.is_completed).length || 0;

                                const habitStr = habitsRes.data?.map(h => `${h.name} (${h.current_streak} days)`).join(', ') || 'None';

                                return {
                                    success: true,
                                    stats: {
                                        focusTimeMinutes: focusTime,
                                        weeklyTasksCompleted: completedThisWeek,
                                        totalPendingTasks: pendingTasks,
                                        activeHabitStreaks: habitStr
                                    }
                                };
                            } catch (err) {
                                console.error('[TOOL_ERROR] readStats:', err);
                                return { success: false, error: "Failed to gather stats" };
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
                            console.log(`[TOOL_CALL] addTask: title=${title}`);
                            const { error: taskError } = await supabase.from('tasks').insert({
                                user_id: user.id,
                                title: title,
                                due_date: dueDate || null,
                                priority: 'medium'
                            });

                            if (taskError) {
                                console.error('[TOOL_ERROR] addTask:', taskError);
                                return { success: false, error: 'Failed to save task' };
                            }

                            return { success: true, message: `Task "${title}" added.` };
                        }
                    })
                }
            } as any);

            return result.toTextStreamResponse();
        } catch (streamingError: any) {
            console.error('[AI_GENERATION_ERROR]', streamingError);
            
            // Check for quota or rate limit errors
            if (streamingError.message?.toLowerCase().includes('quota') || streamingError.message?.toLowerCase().includes('429')) {
                return new Response(
                    "Error: AI API rate limit exceeded. Please wait a minute and try again.", 
                    { status: 429, headers: { 'Content-Type': 'text/plain' } }
                );
            }
            
            throw streamingError; // Let the outer catch handle unexpected errors
        }








    } catch (error: any) {
        console.error('[CHAT_API_ERROR]', error);
        
        return new Response(
            JSON.stringify({ error: error.message || 'An unexpected error occurred' }), 
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}
