import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStartAndEndOfWeek } from '@/lib/utils/insights';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
                return NextResponse.json(
                    { error: 'Daily limit reached. Upgrade to Pro for unlimited AI chat.' },
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
        const notesData = notes && notes.length > 0
            ? notes.map((note, index) => `Note ${index + 1} Title: ${note.title}, Content: ${note.content}`).join(' | ')
            : 'No recent notes found.';

        const fullContext = `[USER CONTEXT BLOCK] \n--- RECENT NOTES --- \n ${notesData} \n--- WEEKLY PRODUCTIVITY STATS --- \n Focus Time: ${focusTime} mins | Tasks: ${tasksCompleted}/${tasksTotal} | Habit Streaks: ${habitDataString}`;

        // 6. Initialize Gemini
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are the Focalyst AI, an elite productivity coach, behavioral scientist, and personal tutor. You have access to the user's [USER CONTEXT BLOCK] which contains their recent notes and quantitative productivity stats. \n**Rule 1 - Productivity Analysis:** When asked about productivity, you MUST deeply analyze their 'Weekly Productivity Stats'. Break down their Strengths and Areas for Growth. \n**Rule 2 - Research-Backed Coaching:** You MUST quote scientific research, behavioral psychology, and popular productivity frameworks (e.g., Cal Newport's Deep Work, James Clear's Atomic Habits, Pomodoro technique, Huberman's protocols) to explain their metrics and provide actionable advice. \n**Rule 3 - Knowledge Tutor:** When asked about concepts in their 'Recent Notes', act as an expert tutor to explain and expand on those specific topics. \nAlways format your responses in clean, highly scannable Markdown.",
        });

        // 4. Inject Context into the first message
        const chatMessages = messages.map((m: any, index: number) => {
            if (index === 0 && m.role === 'user') {
                return {
                    role: 'user',
                    parts: [{ text: `${fullContext}\n\n${m.content}` }]
                };
            }
            return {
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            };
        });

        // Extract the last message to send (Gemini Chat API style)
        const lastMessage = chatMessages.pop();
        if (!lastMessage) {
            return NextResponse.json({ error: 'No message provided' }, { status: 400 });
        }
        const history = chatMessages;

        const chat = model.startChat({
            history: history,
        });

        // 5. Streaming Response
        const result = await chat.sendMessageStream(lastMessage.parts[0].text);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (error: any) {
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        
        if (error?.status === 429) {
            return NextResponse.json({ error: 'Focalyst AI is currently experiencing high demand. Please try again in a moment.' }, { status: 429 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
