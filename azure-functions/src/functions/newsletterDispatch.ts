import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { BatchNumber, dispatchNewsletterBatch } from '../shared/newsletterDispatcher';

function resolveBatchForUtcDay(utcDay: number): BatchNumber | null {
  if (utcDay === 0) return 1; // Sunday
  if (utcDay === 1) return 2; // Monday
  if (utcDay === 2) return 3; // Tuesday
  return null;
}

export async function newsletterDispatchTimerHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  const now = new Date();
  const batchNumber = resolveBatchForUtcDay(now.getUTCDay());

  if (!batchNumber) {
    context.log(`[newsletterDispatchTimer] UTC day ${now.getUTCDay()} is not Sunday/Monday/Tuesday. Skipping.`);
    return;
  }

  context.log(`[newsletterDispatchTimer] Running batch ${batchNumber} at ${now.toISOString()}`);

  try {
    const result = await dispatchNewsletterBatch({
      batchNumber,
      log: (msg) => context.log(msg),
    });
    context.log('[newsletterDispatchTimer] Result:', JSON.stringify(result));
  } catch (err: any) {
    context.error('[newsletterDispatchTimer] Failed:', err?.message || err);
    throw err;
  }
}

export async function newsletterDispatchHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const secret = process.env.NEWSLETTER_CRON_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.headers.get('x-newsletter-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (provided !== secret) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }
  }

  let body: Record<string, any> = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as Record<string, any>;
    } catch {
      body = {};
    }
  }

  const rawBatch =
    body.batch_number ??
    request.query.get('batch_number') ??
    resolveBatchForUtcDay(new Date().getUTCDay());

  const batchNumber = Number(rawBatch) as BatchNumber;
  if (![1, 2, 3].includes(batchNumber)) {
    return {
      status: 400,
      jsonBody: { error: 'batch_number must be 1 (Sunday), 2 (Monday), or 3 (Tuesday).' },
    };
  }

  const dryRun = body.dry_run === true || request.query.get('dry_run') === 'true';
  const force = body.force === true || request.query.get('force') === 'true';
  const testEmail = (body.test_email ?? request.query.get('test_email')) || undefined;

  try {
    const result = await dispatchNewsletterBatch({
      batchNumber,
      dryRun,
      testEmail,
      force,
      log: (msg) => context.log(msg),
    });
    return { status: 200, jsonBody: result };
  } catch (err: any) {
    context.error('[newsletterDispatchHttp] Error:', err?.message || err);
    return { status: 500, jsonBody: { error: err?.message || 'Internal error' } };
  }
}

// Runs at 09:00 UTC every Sunday (0), Monday (1), and Tuesday (2)
app.timer('newsletterDispatchTimer', {
  schedule: '0 0 9 * * 0,1,2',
  handler: newsletterDispatchTimerHandler,
});

app.http('newsletterDispatchHttp', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'newsletter/dispatch',
  handler: newsletterDispatchHttpHandler,
});
