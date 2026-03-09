import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const { message, tabContext } = await req.json()

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
        const systemInstruction = `You are Focalyst AI, a helpful, concise productivity assistant within the Focalyst app. 
You help users plan their day, reflect on habits, and manage their time using Pomodoro techniques. 
Keep your answers brief (1-3 sentences) and action-oriented. Do not use emojis.`

        // Define the tool
        const addTaskDeclaration: FunctionDeclaration = {
            name: 'addTask',
            description: 'Add a new task to the user\'s To-Do list.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    title: {
                        type: SchemaType.STRING,
                        description: 'The name or title of the task.',
                    },
                    due_date: {
                        type: SchemaType.STRING,
                        description: 'The due date for the task in YYYY-MM-DD format. If today, use the current date in the user\'s timezone.',
                    }
                },
                required: ['title']
            }
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [addTaskDeclaration] }]
        })

        const result = await model.generateContent(message)
        let responseText = ""
        let action = null
        const calls = result.response.functionCalls()

        if (calls && calls.length > 0) {
            const call = calls[0]
            if (call.name === 'addTask') {
                const args = call.args as { title: string, due_date?: string }

                const { error: insertError } = await supabase.from('tasks').insert([
                    {
                        user_id: user.id,
                        title: args.title,
                        due_date: args.due_date || new Date().toISOString().split('T')[0]
                    }
                ])

                if (insertError) {
                    console.error('Task Insert Error:', insertError)
                    responseText = `I had trouble adding the task "${args.title}". Please try again.`
                } else {
                    responseText = `"${args.title}" added to your To-Do list.`
                    action = 'refresh_plan'
                }
            }
        } else {
            responseText = result.response.text()
        }

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
