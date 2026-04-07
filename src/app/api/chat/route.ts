import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        // 1. Fetch user's 10 most recent notes
        const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select('title, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (notesError) {
            console.error('Error fetching notes:', notesError);
        }

        // 2. Assemble Context Block
        const contextBlock = notes && notes.length > 0
            ? notes.map((note, index) => `Note ${index + 1} Title: ${note.title}, Content: ${note.content}`).join(' | ')
            : 'No recent notes found.';

        const fullContext = `[USER CONTEXT BLOCK: ${contextBlock}]`;

        // 3. Initialize Gemini
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are the Focalyst AI, a world-class productivity coach and tutor. Your primary goal is to help the user understand their own thoughts and learn new concepts. Use the provided [USER CONTEXT BLOCK] to answer questions about their notes. If a note contains a complex topic, act as a tutor to break it down. If asked a general question, act as a fast, concise search engine. Always format responses in clean Markdown. Never explicitly mention that you are reading from a 'context block'.",
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
