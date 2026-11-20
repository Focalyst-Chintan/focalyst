import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateNewsletterCopy, type NewsletterTopic } from '../src/lib/newsletter/copywriter';
import { renderNewsletterHtml } from '../src/lib/newsletter/template';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let v = m[2] || '';
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) {
        process.env[m[1]] = v;
      }
    }
  }
}

async function main() {
  loadEnvLocal();

  const targetEmail = process.argv[2] || process.env.TEST_EMAIL || process.env.RESEND_REPLY_TO;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log('[1/4] Fetching first topic from Supabase newsletter_topics...');
  const { data: topic, error: topicError } = await supabase
    .from('newsletter_topics')
    .select('*')
    .order('topic_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (topicError || !topic) {
    throw new Error(`Failed to fetch topic: ${topicError?.message || 'No topics found'}`);
  }

  const typedTopic = topic as NewsletterTopic;
  console.log(` -> Topic #${typedTopic.topic_number}: "${typedTopic.topic_title}" (Pillar ${typedTopic.pillar_number})`);

  console.log('[2/4] Calling Gemini Flash (gemini-3.8-flash) to generate copy...');
  const copy = await generateNewsletterCopy(typedTopic);
  console.log(' -> Generated copy:', JSON.stringify(copy, null, 2));

  console.log('[3/4] Rendering Focalyst HTML email template...');
  const html = renderNewsletterHtml(copy);
  console.log(` -> Rendered HTML (${html.length} bytes), unsubscribe tag present: ${html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')}`);

  console.log('[4/4] Sending live test email via Resend...');
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is missing in .env.local. Add RESEND_API_KEY and pass your email: npx tsx scripts/test-newsletter.ts you@example.com');
  }
  if (!targetEmail) {
    throw new Error('No recipient email provided. Pass it as an argument: npx tsx scripts/test-newsletter.ts you@example.com');
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Team Focalyst <updates@focalyst.online>';
  const replyToAddress = process.env.RESEND_REPLY_TO || targetEmail;

  console.log(` -> Sending from="${fromAddress}" to="${targetEmail}" replyTo="${replyToAddress}"`);

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: targetEmail,
    replyTo: replyToAddress,
    subject: `[TEST] ${copy.subject}`,
    html,
  });

  if (sendError) {
    throw new Error(`Resend API error: ${JSON.stringify(sendError)}`);
  }

  console.log(' -> Test email sent successfully!', sendData);
}

main().catch((err) => {
  console.error('[test-newsletter] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
