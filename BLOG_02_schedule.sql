-- ============================================================================
-- Focalyst blog automation · SQL 02 (schedules)
-- Run ONLY after the 3 Edge Functions are deployed and the first test drafts
-- look right (see BLOG_AUTOMATION.md, phase B3). Safe to run again.
--
-- Before running, replace the 2 placeholders below:
--   <PROJECT_REF>  your Supabase project ref (the part before .supabase.co)
--   <CRON_SECRET>  the same random secret you set for the Edge Functions
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Store the URL and secret in Vault (encrypted), once.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'blog_project_url') then
    perform vault.create_secret('https://<PROJECT_REF>.supabase.co', 'blog_project_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'blog_cron_secret') then
    perform vault.create_secret('<CRON_SECRET>', 'blog_cron_secret');
  end if;
end $$;

-- A tiny helper that calls one of the blog Edge Functions.
create or replace function public.blog_call(p_fn text)
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'blog_project_url')
           || '/functions/v1/' || p_fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'blog_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$$;
revoke all on function public.blog_call(text) from public, anon, authenticated;

-- Remove old versions of these schedules, then create them.
do $$
declare j text;
begin
  foreach j in array array['blog-daily', 'blog-worker', 'blog-watch', 'blog-trends', 'blog-log-cleanup'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

-- 1. Create today's post job at the configured hour (checked every hour; the
--    function itself makes sure there is only one job per day).
select cron.schedule('blog-daily', '5 * * * *', $$
  select public.blog_enqueue_daily()
   where extract(hour from now() at time zone 'utc') >= (select daily_hour_utc from public.blog_config where id);
$$);

-- 2. Move jobs forward one stage every 10 minutes.
select cron.schedule('blog-worker', '*/10 * * * *', $$ select public.blog_call('blog-worker'); $$);

-- 3. Look for new OpenAI, Anthropic and Google model launches every 3 hours.
select cron.schedule('blog-watch', '20 */3 * * *', $$ select public.blog_call('blog-watch'); $$);

-- 4. Refill the topic backlog from trends every Monday and Thursday.
select cron.schedule('blog-trends', '40 2 * * 1,4', $$ select public.blog_call('blog-trends'); $$);

-- 5. Keep the log small.
select cron.schedule('blog-log-cleanup', '15 3 * * *', $$
  delete from public.blog_log where at < now() - interval '30 days';
$$);

-- Check: expect 5 schedules
select jobname, schedule, active from cron.job where jobname like 'blog-%' order by jobname;
