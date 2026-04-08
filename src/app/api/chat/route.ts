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
                    content: newUserMessage.content,
                }
            ]);
        }

        // 3. Fetch user's 10 most recent notes
        const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select('title, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (notesError) {
            console.error('Error fetching notes:', notesError);
        }

        // 4. Fetch Weekly Productivity Stats
        const todayForStats = new Date();
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(todayForStats);
        
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

        const { data: focusData } = await supabase
            .from('daily_focus_activity')
            .select('focus_time_minutes')
            .eq('user_id', user.id)
            .gte('date', startOfWeekStr)
            .lte('date', endOfWeekStr);

        const focusTime = focusData?.reduce((acc, curr) => acc + (curr.focus_time_minutes || 0), 0) || 0;

        const { data: pendingData } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_completed', false);

        const { data: completedWeeklyData } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .gte('completed_at', startOfWeek.toISOString())
            .lte('completed_at', endOfWeek.toISOString());

        const tasksCompleted = completedWeeklyData?.length || 0;
        const tasksTotal = tasksCompleted + (pendingData?.length || 0);

        const { data: habitsData } = await supabase
            .from('habits')
            .select('name, current_streak')
            .eq('user_id', user.id)
            .eq('is_active', true);

        const habitDataString = habitsData && habitsData.length > 0
            ? habitsData.map(h => `${h.name} (${h.current_streak} days)`).join(', ')
            : 'No active streaks';

        // 5. Assemble Context Block
        const notesData = (notes && notes.length > 0)
            ? notes.map((note, index) => `Note ${index + 1} Title: ${note.title}, Content: ${note.content}`).join(' | ')
            : 'No recent notes found.';

        const fullContext = `[USER CONTEXT] \n--- RECENT NOTES --- \n ${notesData} \n--- PRODUCTIVITY STATS --- \n Focus Time: ${focusTime || 0} mins | Tasks: ${tasksCompleted || 0}/${tasksTotal || 0} | Habit Streaks: ${habitDataString || ""}`;

        // Prepare System Instructions
        const systemInstruction = 
            "You are the Focalyst AI, an elite productivity coach, behavioral scientist, and personal tutor. \n" +
            "**Rule 1 - Analysis:** When asked about productivity, deeply analyze their 'Productivity Stats' context. Identify Strengths and Areas for Growth. \n" +
            "**Rule 2 - Science:** You MUST quote scientific research, behavioral psychology, and popular productivity frameworks (e.g., Deep Work, Huberman, Atomic Habits) to explain their metrics and offer advice. \n" +
            "**Rule 3 - Tutoring:** When asked about concepts in their 'Recent Notes', act as an expert tutor to explain and expand on those topics. \n" +
            "**Rule 4:** If the user asks to add a task, reminder, or to-do, you MUST use the `addTask` tool. Confirm with the user once successful.\n" +
            "Format strictly in highly scannable Markdown. Never explicitly say you are reading a context block.";

        // 6. Inject context into the first message before calling the model
        const messagesWithContext = [...messages];
        if (messagesWithContext.length > 0 && messagesWithContext[0].role === 'user' && fullContext) {
            messagesWithContext[0] = {
                ...messagesWithContext[0],
                content: `${fullContext}\n\n${messagesWithContext[0].content}`
            };
        }

        // 7. Use streamText for AI SDK v3+ Streaming
        const result = streamText({
            model: google('gemini-1.5-flash'),
            system: systemInstruction,
            messages: messagesWithContext,
            tools: {
                addTask: tool({
                    description: "Use this tool to add a new task or to-do item to the user's database. MUST be used when user expresses intention to add a task.",
                    parameters: z.object({
                        title: z.string().describe("The name or title of the task to add"),
                        dueDate: z.string().optional().describe("The due date in YYYY-MM-DD format if specified")
                    }),
                    // @ts-ignore
                    execute: async ({ title, dueDate }: { title: string, dueDate?: string }) => {
                        const { error: taskError } = await supabase.from('tasks').insert({
                            user_id: user.id,
                            title: title,
                            due_date: dueDate || null,
                            priority: 'medium'
                        });

                        if (taskError) {
                            console.error('[CHAT_TOOL_ERROR] Failed to add task:', taskError);
                            return { success: false, error: 'Database error' };
                        }

                        return { success: true, message: `Task "${title}" added successfully` };
                    }
                })
            }
        });

        // 8. Return the stream using the correct v3 method
        return result.toTextStreamResponse();

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
