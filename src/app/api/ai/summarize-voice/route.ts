import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FREE_TIER_LIMITS } from '@/lib/featureGates'
import { rateLimit } from '@/lib/rate-limit'
import { generateAIResponse } from '@/lib/services/aiService'
import { FOCALYST_AI_PERSONA } from '@/constants/focalystPersona'

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

        const systemPrompt = `${FOCALYST_AI_PERSONA}

## Special Instructions for Voice Note Processing
You are an expert transcriber and note-taking assistant.
You will receive raw transcript text from a voice recording.
First, determine a short, professional title for this note (max 6 words).
Then, create a structured, professional summary of the transcript with bullet points. Format the output in clean HTML that a rich text editor can display.
Important: Your entire response must ONLY be the HTML content. Put the title in an <h1> tag at the very top.`;

        try {
            let text = await generateAIResponse(
                [{ role: 'user', content: `Here is the transcript:\n"${transcript}"` }],
                systemPrompt
            );

            // Clean the text from any markdown code blocks
            if (text.startsWith('```html')) {
                text = text.replace(/^```html\s*/, '');
                text = text.replace(/\s*```$/, '');
            } else if (text.startsWith('```')) {
                text = text.replace(/^```\s*/, '');
                text = text.replace(/\s*```$/, '');
            }

            // Extract title from h1 if possible
            const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match && h1Match[1]) {
                title = h1Match[1].trim();
                text = text.replace(/<h1[^>]*>.*?<\/h1>/i, '').trim();
            }

            summary = text;
        } catch (e: any) {
            console.error("Voice Note AI Generation Error:", e);
            summary = `<p>Error generating summary: ${escapeHtml(e?.message || 'Unknown error')}</p><p>${escapeHtml(transcript)}</p>`;
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

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true, note: data })

    } catch (error: any) {
        console.error('Error saving voice note:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
