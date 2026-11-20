import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, Part } from '@google/generative-ai'
import { FREE_TIER_LIMITS, dateKeyFromSupabase, localDateKey } from '@/lib/featureGates'
import { rateLimit } from '@/lib/rate-limit'
import { localDateStr } from '@/lib/utils/date'
import {
  getDailyFocusActivity,
  insertAiChatLogs,
  incrementUserAiUsage,
  getHabitsByUser,
  getTasksByUser,
  upsertTask,
  upsertHabit,
  getUserProfile,
} from '@/lib/server/azure-db'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        const auth = await requireUser(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { user, supabase } = auth;

        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!rateLimit(ip, 20, 60000)) {
            return NextResponse.json({ error: 'Too many requests. Please wait a minute before sending more messages.' }, { status: 429 });
        }

        const body = await req.json()
        let rawMessage = body.message
        let messages = body.messages

        // Support both single message and messages array
        if (!rawMessage && Array.isArray(messages) && messages.length > 0) {
            const lastMsg = messages[messages.length - 1]
            rawMessage = typeof lastMsg?.content === 'string' ? lastMsg.content : (lastMsg?.parts?.[0]?.text || '')
        }

        if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        // Bound to last 10 messages if array provided and cap message at 3000 chars
        if (Array.isArray(messages)) {
            messages = messages.slice(-10).map((msg: any) => {
                if (typeof msg.content === 'string' && msg.content.length > 3000) {
                    return { ...msg, content: msg.content.slice(0, 3000) + '... [truncated for length]' }
                }
                return msg
            })
        }
        const message = rawMessage.length > 3000 ? rawMessage.slice(0, 3000) + '... [truncated for length]' : rawMessage

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

        // 1. Check User Plan & Limits
        const { data: userData } = await supabase
            .from('users')
            .select('plan, ai_message_count, last_message_date')
            .eq('id', user.id)
            .single()

        const isFree = userData?.plan === 'free'
        let currentMessageCount = userData?.ai_message_count || 0

        if (isFree) {
            const todayKey = localDateKey()
            const lastKey = dateKeyFromSupabase(userData?.last_message_date)

            if (lastKey !== todayKey) {
                currentMessageCount = 0
                await supabase
                    .from('users')
                    .update({
                        ai_message_count: 0,
                        last_message_date: new Date().toISOString(),
                    })
                    .eq('id', user.id)
            }

            if (currentMessageCount >= FREE_TIER_LIMITS.aiMessagesPerDay) {
                return NextResponse.json(
                    { error: 'Daily limit reached. Upgrade to Pro for unlimited AI chat.' },
                    { status: 429 }
                )
            }
        }

        // 2. Call Gemini API
        // System Prompt to define Focalyst's persona
        const systemInstruction = `You are the Focalyst AI Productivity Coach. Your goal is to analyze user data, provide candid but empathetic feedback, and optimize their daily schedules.

You have access to the user's database via tools. Always fetch their data before giving a productivity review.

When giving suggestions or pointing out weaknesses, you MUST cite actual psychological, neuroscientific, or behavioral science research (e.g., Huberman, chronotypes, Zeigarnik effect, habit loops). Do not give generic advice.

If the user asks to plan their day, first ask them for their goals and available free time. Once they reply, automatically use the create_todos tool to populate their list.`

        // Define the tools
        const getProductivityDataDeclaration: FunctionDeclaration = {
            name: 'get_user_productivity_data',
            description: 'Fetches the user\'s current metrics (focus/break hours, habit streaks, to-do completion) to provide a review.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {},
            }
        }

        const createTodosDeclaration: FunctionDeclaration = {
            name: 'create_todos',
            description: 'Automatically adds an array of tasks to the user\'s to-do list.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    tasks: {
                        type: SchemaType.ARRAY,
                        description: 'An array of tasks to add.',
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                task_name: { type: SchemaType.STRING, description: 'The name of the task.' },
                                estimated_minutes: { type: SchemaType.NUMBER, description: 'Estimated time in minutes.' }
                            },
                            required: ['task_name']
                        }
                    }
                },
                required: ['tasks']
            }
        }

        const createHabitDeclaration: FunctionDeclaration = {
            name: 'create_new_habit',
            description: 'Sets up a new daily habit tracker for the user.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    habit_name: { type: SchemaType.STRING, description: 'The name of the new habit.' }
                },
                required: ['habit_name']
            }
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3.8-flash",
            systemInstruction: systemInstruction,
        })

        // Start multi-turn chat
        const chat = model.startChat({
            tools: [{ functionDeclarations: [getProductivityDataDeclaration, createTodosDeclaration, createHabitDeclaration] }]
        })

        const result = await chat.sendMessage(message)
        let response = result.response
        let action = null

        // Loop to handle tool calls
        let cachedStatsThisTurn: any = null
        while (response.functionCalls()?.length) {
            const calls = response.functionCalls()!
            const toolResults: { name: string; response: unknown }[] = []

            for (const call of calls) {
                if (call.name === 'get_user_productivity_data') {
                    if (cachedStatsThisTurn) {
                        toolResults.push({
                            name: 'get_user_productivity_data',
                            response: cachedStatsThisTurn
                        })
                    } else {
                        // Fetch last 7 days of focus data from Azure DB (with Supabase fallback)
                        const sevenDaysAgo = new Date()
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
                        const sevenDaysStr = localDateStr(sevenDaysAgo)

                        let focusData: any[] = []
                        try {
                            const azureFocus = await getDailyFocusActivity(user.id, sevenDaysStr)
                            focusData = azureFocus.map((f) => ({
                                date: f.date,
                                focus_time_minutes: f.focus_time_minutes,
                                break_time_minutes: f.break_time_minutes,
                            }))
                        } catch {
                            const { data } = await supabase
                                .from('daily_focus_activity')
                                .select('date, focus_time_minutes, break_time_minutes')
                                .eq('user_id', user.id)
                                .gte('date', sevenDaysStr)
                            focusData = data || []
                        }

                        // Fetch active habit streaks (Azure DB primary, Supabase fallback)
                        let habits: any[] = []
                        try {
                            const azHabits = await getHabitsByUser(user.id, true)
                            habits = azHabits.map((h) => ({ name: h.name, current_streak: h.current_streak }))
                        } catch {
                            const { data: sbHabits } = await supabase
                                .from('habits')
                                .select('name, current_streak')
                                .eq('user_id', user.id)
                                .eq('is_active', true)
                            habits = sbHabits || []
                        }

                        // Fetch task completion percentage (Azure DB primary, Supabase fallback)
                        let tasks: any[] = []
                        try {
                            const azTasks = await getTasksByUser(user.id)
                            tasks = azTasks.map((t) => ({ is_completed: t.is_completed }))
                        } catch {
                            const { data: sbTasks } = await supabase
                                .from('tasks')
                                .select('is_completed')
                                .eq('user_id', user.id)
                            tasks = sbTasks || []
                        }

                        const totalTasks = tasks?.length || 0
                        const completedTasks = tasks?.filter((t: any) => t.is_completed).length || 0
                        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

                        cachedStatsThisTurn = {
                            focus_activity: focusData || [],
                            habit_streaks: habits || [],
                            task_completion_stats: {
                                total_tasks: totalTasks,
                                completed_tasks: completedTasks,
                                completion_rate: completionRate.toFixed(1) + '%'
                            }
                        }

                        toolResults.push({
                            name: 'get_user_productivity_data',
                            response: cachedStatsThisTurn
                        })
                    }
                }

                if (call.name === 'create_todos') {
                    const args = call.args as { tasks: { task_name: string, estimated_minutes?: number }[] }
                    let insertSuccess = true
                    let insertErrMsg: string | undefined

                    try {
                        for (const t of args.tasks) {
                            await upsertTask(user.id, {
                                title: t.task_name,
                                due_date: localDateStr(),
                                priority: 'medium',
                            })
                        }
                    } catch (err: any) {
                        // Fallback to Supabase
                        const tasksToInsert = args.tasks.map((t) => ({
                            id: crypto.randomUUID(),
                            user_id: user.id,
                            title: t.task_name,
                            due_date: localDateStr(),
                            priority: 'medium'
                        }))
                        const { error: insertError } = await supabase.from('tasks').upsert(tasksToInsert, { onConflict: 'id' })
                        insertSuccess = !insertError
                        insertErrMsg = insertError?.message
                    }

                    toolResults.push({
                        name: 'create_todos',
                        response: { success: insertSuccess, error: insertErrMsg }
                    })
                    if (insertSuccess) action = 'refresh_plan'
                }

                if (call.name === 'create_new_habit') {
                    const args = call.args as { habit_name: string }
                    if (isFree) {
                        let activeCount = 0
                        try {
                            const azHabits = await getHabitsByUser(user.id, true)
                            activeCount = azHabits.length
                        } catch {
                            const { count } = await supabase
                                .from('habits')
                                .select('id', { count: 'exact', head: true })
                                .eq('user_id', user.id)
                                .eq('is_active', true)
                            activeCount = count || 0
                        }

                        if (activeCount >= FREE_TIER_LIMITS.habits) {
                            toolResults.push({
                                name: 'create_new_habit',
                                response: { success: false, error: 'Habit limit reached. Upgrade to Pro to add more habits.' }
                            })
                            continue
                        }
                    }

                    let habitSuccess = true
                    let habitErrMsg: string | undefined
                    try {
                        await upsertHabit(user.id, {
                            name: args.habit_name,
                            frequency: 'daily',
                            is_active: true,
                        })
                    } catch (err: any) {
                        const { error: habitError } = await supabase.from('habits').insert({
                            user_id: user.id,
                            name: args.habit_name,
                            frequency: 'daily',
                            is_active: true,
                            current_streak: 0
                        })
                        habitSuccess = !habitError
                        habitErrMsg = habitError?.message
                    }

                    toolResults.push({
                        name: 'create_new_habit',
                        response: { success: habitSuccess, error: habitErrMsg }
                    })
                    if (habitSuccess) action = 'refresh_plan'
                }
            }

            // Send tool results back to Gemini
            const parts: Part[] = toolResults.map(tr => ({
                functionResponse: {
                    name: tr.name,
                    response: tr.response as any
                }
            }))
            const resultNext = await chat.sendMessage(parts)
            response = resultNext.response
        }

        const responseText = response.text()

        // 3. Log Conversations to Azure PostgreSQL & Supabase
        try {
            await insertAiChatLogs([
                {
                    user_id: user.id,
                    role: 'user',
                    content: message,
                },
                {
                    user_id: user.id,
                    role: 'assistant',
                    content: responseText,
                }
            ])
            if (isFree) {
                await incrementUserAiUsage(user.id)
            }
        } catch (azureErr: any) {
            console.error('[AI_API] Azure DB log error:', azureErr?.message)
        }

        try {
            await supabase.from('ai_chat_logs').insert([
                {
                    user_id: user.id,
                    role: 'user',
                    content: message,
                },
                {
                    user_id: user.id,
                    role: 'assistant',
                    content: responseText,
                }
            ])
        } catch {}

        if (isFree) {
            await supabase
                .from('users')
                .update({
                    ai_message_count: currentMessageCount + 1,
                    last_message_date: new Date().toISOString(),
                })
                .eq('id', user.id)
        }

        return NextResponse.json({ reply: responseText, action })

    } catch (error: any) {
        const correlationId = crypto.randomUUID();
        console.error(`[AI_API_ERROR] [${correlationId}]`, error?.message || error);
        return NextResponse.json(
            { error: 'Failed to process request. Please try again later.', correlationId },
            { status: 500 }
        )
    }
}
