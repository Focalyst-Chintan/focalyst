import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { streamChat, type ChatMessageParam } from '@/lib/ai/providers';
import { buildUserContext } from '@/lib/ai/chatContext';
import { AI_PERSONA } from '@/lib/ai/persona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

function getTodayRangeInTz(timezone = 'Asia/Kolkata') {
  let tz = timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    tz = 'Asia/Kolkata';
  }
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayDateStr = formatter.format(now); // "YYYY-MM-DD"

  // Compute UTC start for midnight in user's timezone
  const invDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const diff = now.getTime() - invDate.getTime();
  const localMidnight = new Date(`${todayDateStr}T00:00:00Z`);
  const startOfDayUtc = new Date(localMidnight.getTime() + diff);

  return { todayDateStr, startOfDayIso: startOfDayUtc.toISOString(), tz };
}

function isHeavyQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('what should i focus on today') ||
    lower.includes('what to focus on') ||
    lower.includes('how productive') ||
    lower.includes('weekly report') ||
    lower.includes('productivity report') ||
    lower.includes('summarise my week') ||
    lower.includes('summarize my week') ||
    lower.includes('my productivity') ||
    lower.includes('habit pattern') ||
    lower.includes('analyse my habit') ||
    lower.includes('study plan') ||
    lower.includes('project plan') ||
    lower.includes('wasted the day') ||
    lower.includes('procrastinated')
  );
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { user, supabase } = auth;

  try {
    const body = await req.json().catch(() => ({}));

    let rawMessages: any[] = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      rawMessages = body.messages;
    } else if (typeof body.message === 'string' && body.message.trim()) {
      rawMessages = [{ role: 'user', content: body.message.trim() }];
    }

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400, headers: cors });
    }

    // Sanitize and extract latest user prompt
    const bounded = rawMessages.slice(-10);
    const normalizedMessages: ChatMessageParam[] = bounded.map((m: any) => {
      let content = '';
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.parts)) {
        content = m.parts.map((p: any) => p.text || '').join('');
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: content.slice(0, 3000),
      };
    });

    const lastUserMsg = [...normalizedMessages].reverse().find((m) => m.role === 'user');
    const userPrompt = lastUserMsg?.content || '';

    // Fetch user profile (timezone, plan)
    const { data: profile } = await supabase
      .from('users')
      .select('timezone, plan')
      .eq('id', user.id)
      .single();

    const tz = profile?.timezone || 'Asia/Kolkata';
    const isPro = profile?.plan && profile.plan !== 'free';
    const dailyLimit = isPro ? 100 : 5;

    const { startOfDayIso } = getTodayRangeInTz(tz);

    // Count today's messages in user's timezone from ai_chat_logs
    const { count: todayCount, error: countErr } = await supabase
      .from('ai_chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', startOfDayIso);

    if (countErr) {
      console.error('[ai:chat]', 'supabase', 500, countErr.message);
    }

    const currentUsage = todayCount ?? 0;
    if (currentUsage >= dailyLimit) {
      return NextResponse.json(
        {
          code: 'quota',
          error: "You have used today's Focalyst AI messages. Upgrade to Pro for more.",
        },
        { status: 429, headers: cors }
      );
    }

    // Build real-time context with user's signed-in Supabase client
    const userContext = await buildUserContext(supabase, user.id, tz);
    const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(new Date());
    const system = [
      AI_PERSONA,
      'Always finish your answer completely. Use short paragraphs and simple markdown (bold, bullet lists, numbered steps). Never stop mid-sentence.',
      `Today is ${today} (${tz}).`,
      `The user's Focalyst data:\n${userContext}`,
    ].join('\n\n');

    const modelType = isHeavyQuery(userPrompt) ? 'heavy' : 'light';
    const { stream, provider } = await streamChat(normalizedMessages, system, modelType);

    // Track stream output to persist in ai_chat_logs and update usage counter
    const textDecoder = new TextDecoder();
    let accumulatedReply = '';

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        accumulatedReply += textDecoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        try {
          // Log user and assistant messages
          await supabase.from('ai_chat_logs').insert([
            {
              user_id: user.id,
              role: 'user',
              content: userPrompt,
              tab_context: 'chat',
            },
            {
              user_id: user.id,
              role: 'assistant',
              content: accumulatedReply,
              tab_context: 'chat',
            },
          ]);

          // Update user's daily message counter
          await supabase
            .from('users')
            .update({
              ai_message_count: currentUsage + 1,
              last_message_date: new Date().toISOString(),
            })
            .eq('id', user.id);
        } catch (dbErr: any) {
          console.error('[ai:chat]', 'supabase', 500, 'Failed to save chat logs: ' + dbErr?.message);
        }
      },
    });

    const responseStream = stream.pipeThrough(transformStream);

    return new Response(responseStream, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-AI-Provider': provider,
      },
    });
  } catch (err: any) {
    console.error('[ai:chat]', 'server', 500, err?.message || 'Unexpected chat error');
    return NextResponse.json(
      { error: 'Focalyst AI is busy right now. Please try again in a moment.' },
      { status: 500, headers: cors }
    );
  }
}
