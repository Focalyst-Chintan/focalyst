import { app, InvocationContext, Timer } from '@azure/functions';
import { blogEnqueueDaily, cleanupOldLogs, getConfig, logEvent } from '../shared/db';

export async function blogDailyHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('[blogDaily] Timer triggered at:', new Date().toISOString());

  try {
    const config = await getConfig();
    if (!config.enabled) {
      context.log('[blogDaily] Blog automation is disabled in blog_config.');
      return;
    }

    const nowUtc = new Date();
    const currentUtcHour = nowUtc.getUTCHours();
    context.log(`[blogDaily] Current UTC hour: ${currentUtcHour}, Configured daily_hour_utc: ${config.daily_hour_utc}`);

    if (currentUtcHour >= config.daily_hour_utc) {
      const jobId = await blogEnqueueDaily();
      if (jobId) {
        context.log(`[blogDaily] Successfully enqueued daily blog job: ${jobId}`);
        await logEvent('daily_job_enqueued', jobId, 'daily', Date.now() - startTime, {
          utcHour: currentUtcHour,
          targetPillar: config.weekday_pillars?.[String(nowUtc.getUTCDay() || 7)],
        });
      } else {
        context.log('[blogDaily] Daily job for today was already enqueued or no matching topic found.');
      }
    } else {
      context.log('[blogDaily] Skipping daily enqueue: UTC hour is before daily_hour_utc.');
    }

    // Daily cleanup of old blog_log entries (> 30 days)
    const cleanedCount = await cleanupOldLogs(30);
    if (cleanedCount > 0) {
      context.log(`[blogDaily] Cleaned up ${cleanedCount} log entries older than 30 days.`);
    }
  } catch (err: any) {
    context.error('[blogDaily] Error executing daily trigger:', err.message);
    await logEvent('daily_error', null, 'daily', Date.now() - startTime, { error: err.message });
  }
}

app.timer('blogDaily', {
  schedule: '0 5 * * * *',
  handler: blogDailyHandler,
});
