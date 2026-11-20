import { NextResponse } from 'next/server';
import { dispatchNewsletterBatch, type BatchNumber } from '@/lib/newsletter/dispatcher';

export const maxDuration = 300;

function resolveBatchForUtcDay(utcDay: number): BatchNumber | null {
  if (utcDay === 0) return 1; // Sunday
  if (utcDay === 1) return 2; // Monday
  if (utcDay === 2) return 3; // Tuesday
  return null;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.NEWSLETTER_CRON_SECRET;
  if (!secret) return true;
  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get('x-newsletter-secret');
  return authHeader === `Bearer ${secret}` || customHeader === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawBatch = searchParams.get('batch_number') ?? resolveBatchForUtcDay(new Date().getUTCDay());

  if (rawBatch === null) {
    return NextResponse.json({
      message: 'Skipped: Newsletter batches only run on Sunday (1), Monday (2), and Tuesday (3).',
    });
  }

  const batchNumber = Number(rawBatch) as BatchNumber;
  if (![1, 2, 3].includes(batchNumber)) {
    return NextResponse.json(
      { error: 'batch_number must be 1 (Sunday), 2 (Monday), or 3 (Tuesday).' },
      { status: 400 }
    );
  }

  const dryRun = searchParams.get('dry_run') === 'true';
  const force = searchParams.get('force') === 'true';
  const testEmail = searchParams.get('test_email') || undefined;

  try {
    const result = await dispatchNewsletterBatch({
      batchNumber,
      dryRun,
      force,
      testEmail,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[newsletter-dispatch] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const rawBatch = body.batch_number ?? resolveBatchForUtcDay(new Date().getUTCDay());
  const batchNumber = Number(rawBatch) as BatchNumber;

  if (![1, 2, 3].includes(batchNumber)) {
    return NextResponse.json(
      { error: 'batch_number must be 1 (Sunday), 2 (Monday), or 3 (Tuesday).' },
      { status: 400 }
    );
  }

  const dryRun = body.dry_run === true;
  const force = body.force === true;
  const testEmail = typeof body.test_email === 'string' ? body.test_email : undefined;

  try {
    const result = await dispatchNewsletterBatch({
      batchNumber,
      dryRun,
      force,
      testEmail,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[newsletter-dispatch] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
