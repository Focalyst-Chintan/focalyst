import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'
import { rateLimit } from '@/lib/rate-limit'

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!rateLimit(ip, 10, 60000)) {
            return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
        }

        const { transcript, durationSeconds } = await req.json()

        if (!transcript) {
            return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .single()

        if (profile?.plan === 'free') {
            const { count } = await supabase
                .from('notes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (count !== null && count >= FREE_TIER_LIMITS.notes) {
                return NextResponse.json({ error: 'Note limit reached' }, { status: 402 })
            }
        }

        let summary = "No summary generated."
        let title = "Voice Note"

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
                const prompt = `
You are an expert transcriber and note-taking assistant.
I am providing you with a raw transcript from a voice recording.
First, determine a short, professional title for this note (max 6 words).
Then, create a structured, professional summary of the transcript with bullet points. Format the output in clean HTML that a rich text editor can display.
Important: Your entire response must ONLY be the HTML content. Put the title in an <h1> tag at the very top.
Here is the transcript:
"${transcript}"
                `;

                const result = await model.generateContent(prompt);
                const response = result.response;
                let text = response.text();

                // Clean the text from any markdown code blocks
                if (text.startsWith('\`\`\`html')) {
                    text = text.replace(/^\`\`\`html\s*/, '');
                    text = text.replace(/\s*\`\`\`$/, '');
                } else if (text.startsWith('\`\`\`')) {
                    text = text.replace(/^\`\`\`\s*/, '');
                    text = text.replace(/\s*\`\`\`$/, '');
                }

                // Extract title from h1 if possible
                const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
                if (h1Match && h1Match[1]) {
                    title = h1Match[1].trim();
                    // Remove the h1 from the content since our editor uses a separate title field
                    text = text.replace(/<h1[^>]*>.*?<\/h1>/i, '').trim();
                }

                summary = text;
            } catch (e: any) {
                console.error("Gemini API Error:", e);
                summary = `<p>Error generating summary: ${escapeHtml(e?.message || 'Unknown error')}</p>`;
            }
        } else {
            summary = `<p>Gemini API key not configured. Displaying raw transcript:</p><p>${escapeHtml(transcript)}</p>`;
        }

        const { data, error } = await supabase
            .from('notes')
            .insert({
                user_id: user.id,
                title: title,
                content: summary,
                note_type: 'voice',
                transcript: transcript,
                duration_seconds: durationSeconds
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        const correlationId = crypto.randomUUID();
        console.error(`[SUMMARIZE_VOICE_ERROR] [${correlationId}]`, error);
        return NextResponse.json({ error: 'Internal Server Error', correlationId }, { status: 500 })
    }
}
