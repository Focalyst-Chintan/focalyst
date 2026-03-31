import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, Part } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const { message } = await req.json()

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Check User Plan & Limits
        const { data: userData } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .single()

        const isFree = userData?.plan === 'free'

        if (isFree) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const { count } = await supabase
                .from('ai_chat_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('role', 'user')
                .gte('created_at', today.toISOString())

            if (count !== null && count >= 5) {
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
            model: "gemini-2.5-flash",
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
        while (response.functionCalls()?.length) {
            const calls = response.functionCalls()!
            const toolResults: { name: string; response: unknown }[] = []

            for (const call of calls) {
                if (call.name === 'get_user_productivity_data') {
                    // Fetch last 7 days of focus data
                    const sevenDaysAgo = new Date()
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

                    const { data: focusData } = await supabase
                        .from('daily_focus_activity')
                        .select('date, focus_time_minutes, break_time_minutes')
                        .eq('user_id', user.id)
                        .gte('date', sevenDaysAgo.toISOString().split('T')[0])

                    // Fetch active habit streaks
                    const { data: habits } = await supabase
                        .from('habits')
                        .select('name, current_streak')
                        .eq('user_id', user.id)
                        .eq('is_active', true)

                    // Fetch task completion percentage
                    const { data: tasks } = await supabase
                        .from('tasks')
                        .select('is_completed')
                        .eq('user_id', user.id)

                    const totalTasks = tasks?.length || 0
                    const completedTasks = tasks?.filter(t => t.is_completed).length || 0
                    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

                    toolResults.push({
                        name: 'get_user_productivity_data',
                        response: {
                            focus_activity: focusData || [],
                            habit_streaks: habits || [],
                            task_completion_stats: {
                                total_tasks: totalTasks,
                                completed_tasks: completedTasks,
                                completion_rate: completionRate.toFixed(1) + '%'
                            }
                        }
                    })
                }

                if (call.name === 'create_todos') {
                    const args = call.args as { tasks: { task_name: string, estimated_minutes?: number }[] }
                    const tasksToInsert = args.tasks.map(t => ({
                        user_id: user.id,
                        title: t.task_name,
                        due_date: new Date().toISOString().split('T')[0],
                        priority: 'medium'
                    }))

                    const { error: insertError } = await supabase.from('tasks').insert(tasksToInsert)

                    toolResults.push({
                        name: 'create_todos',
                        response: { success: !insertError, error: insertError?.message }
                    })
                    if (!insertError) action = 'refresh_plan'
                }

                if (call.name === 'create_new_habit') {
                    const args = call.args as { habit_name: string }
                    const { error: habitError } = await supabase.from('habits').insert({
                        user_id: user.id,
                        name: args.habit_name,
                        frequency: 'daily',
                        is_active: true,
                        current_streak: 0
                    })

                    toolResults.push({
                        name: 'create_new_habit',
                        response: { success: !habitError, error: habitError?.message }
                    })
                    if (!habitError) action = 'refresh_plan'
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

        // 3. Log Conversations to Supabase
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

        return NextResponse.json({ reply: responseText, action })

    } catch (error: any) {
        console.error('AI Chat Error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to process request. Please try again later.' },
            { status: 500 }
        )
    }
}
