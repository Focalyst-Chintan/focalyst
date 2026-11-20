import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase-admin';
import { getNextUnsentTopic, getOrGenerateTopicCopy } from './copywriter';
import { renderNewsletterHtml, type NewsletterCopy } from './template';

export type BatchNumber = 1 | 2 | 3;

export interface DispatchOptions {
  batchNumber: BatchNumber;
  dryRun?: boolean;
  testEmail?: string;
  force?: boolean;
}

export interface DispatchResult {
  status: 'sent' | 'dry_run' | 'test_sent' | 'no_topics' | 'no_users';
  batchNumber: BatchNumber;
  topicId?: string;
  topicTitle?: string;
  subject?: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  topicCompleted: boolean;
  copy?: NewsletterCopy;
}

interface RecipientRow {
  id: string;
  email: string;
  full_name: string | null;
  last_newsletter_sent_at: string | null;
}

const MAX_BATCH_SIZE = 80;
const SEND_DELAY_MS = 180;
const COOLDOWN_DAYS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchNewsletterBatch(options: DispatchOptions): Promise<DispatchResult> {
  const { batchNumber, dryRun = false, testEmail, force = false } = options;

  if (![1, 2, 3].includes(batchNumber)) {
    throw new Error(`Invalid batch_number: ${batchNumber}. Must be 1, 2, or 3.`);
  }

  const supabase = createAdminClient();
  const topic = await getNextUnsentTopic(supabase);

  if (!topic) {
    return {
      status: 'no_topics',
      batchNumber,
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      topicCompleted: false,
    };
  }

  const copy = await getOrGenerateTopicCopy(supabase, topic);
  const html = renderNewsletterHtml(copy);

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Team Focalyst <updates@focalyst.online>';
  const replyToAddress = process.env.RESEND_REPLY_TO || 'contact.sohantamang@gmail.com';

  if (testEmail) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is missing');
    }
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: testEmail,
      replyTo: replyToAddress,
      subject: `[TEST] ${copy.subject}`,
      html,
    });

    if (error) {
      throw new Error(`Resend test send failed: ${error.message}`);
    }

    return {
      status: 'test_sent',
      batchNumber,
      topicId: topic.id,
      topicTitle: topic.topic_title,
      subject: copy.subject,
      targetCount: 1,
      sentCount: 1,
      failedCount: 0,
      topicCompleted: false,
      copy,
    };
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, last_newsletter_sent_at')
    .eq('newsletter_batch', batchNumber)
    .is('deleted_at', null)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH_SIZE);

  if (usersError) {
    throw new Error(`Failed to query users for batch ${batchNumber}: ${usersError.message}`);
  }

  const cutoffMs = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const recipients = ((users || []) as RecipientRow[]).filter((u) => {
    if (!u.email || !u.email.includes('@')) return false;
    if (!force && u.last_newsletter_sent_at) {
      const lastSentMs = new Date(u.last_newsletter_sent_at).getTime();
      if (!Number.isNaN(lastSentMs) && lastSentMs > cutoffMs) {
        return false;
      }
    }
    return true;
  });

  if (dryRun) {
    return {
      status: 'dry_run',
      batchNumber,
      topicId: topic.id,
      topicTitle: topic.topic_title,
      subject: copy.subject,
      targetCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      topicCompleted: false,
      copy,
    };
  }

  if (recipients.length === 0) {
    await supabase.from('newsletter_campaign_logs').insert({
      topic_id: topic.id,
      batch_number: batchNumber,
      sent_count: 0,
    });

    const topicCompleted = await maybeMarkTopicComplete(supabase, topic.id, batchNumber);
    return {
      status: 'no_users',
      batchNumber,
      topicId: topic.id,
      topicTitle: topic.topic_title,
      subject: copy.subject,
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      topicCompleted,
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is missing');
  }
  const resend = new Resend(resendApiKey);

  let sentCount = 0;
  let failedCount = 0;
  const sentUserIds: string[] = [];

  for (const user of recipients) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: fromAddress,
        to: user.email,
        replyTo: replyToAddress,
        subject: copy.subject,
        html,
      });

      if (sendError) {
        failedCount++;
      } else {
        sentCount++;
        sentUserIds.push(user.id);
      }
    } catch {
      failedCount++;
    }

    await sleep(SEND_DELAY_MS);
  }

  if (sentUserIds.length > 0) {
    await supabase
      .from('users')
      .update({ last_newsletter_sent_at: new Date().toISOString() })
      .in('id', sentUserIds);
  }

  await supabase.from('newsletter_campaign_logs').insert({
    topic_id: topic.id,
    batch_number: batchNumber,
    sent_count: sentCount,
  });

  const topicCompleted = await maybeMarkTopicComplete(supabase, topic.id, batchNumber);

  return {
    status: 'sent',
    batchNumber,
    topicId: topic.id,
    topicTitle: topic.topic_title,
    subject: copy.subject,
    targetCount: recipients.length,
    sentCount,
    failedCount,
    topicCompleted,
  };
}

async function maybeMarkTopicComplete(
  supabase: ReturnType<typeof createAdminClient>,
  topicId: string,
  currentBatch: BatchNumber
): Promise<boolean> {
  const { data: logs, error } = await supabase
    .from('newsletter_campaign_logs')
    .select('batch_number')
    .eq('topic_id', topicId);

  if (error) {
    return false;
  }

  const completedBatches = new Set((logs || []).map((l: { batch_number: number }) => l.batch_number));
  const allThreeDone = completedBatches.has(1) && completedBatches.has(2) && completedBatches.has(3);

  if (allThreeDone || currentBatch === 3) {
    const { error: updateError } = await supabase
      .from('newsletter_topics')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', topicId);

    if (!updateError) {
      return true;
    }
  }

  return false;
}
