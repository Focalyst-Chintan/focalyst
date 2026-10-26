-- 06_insights_rpc.sql
-- Function to compute focus daily totals aggregated in Postgres
-- Adapting duration_minutes -> focus_minutes for pomodoro_sessions schema

create or replace function public.focus_daily_totals(p_from date, p_to date, p_tz text default 'Asia/Kolkata')
returns table (day date, minutes int, sessions int)
language sql stable security invoker set search_path = public as $$
  select (s.started_at at time zone p_tz)::date as day,
         coalesce(sum(s.focus_minutes), 0)::int as minutes,
         count(*)::int as sessions
  from public.pomodoro_sessions s
  where s.user_id = (select auth.uid())
    and s.started_at >= (p_from::timestamp at time zone p_tz)
    and s.started_at <  ((p_to + 1)::timestamp at time zone p_tz)
  group by 1
  order by 1;
$$;

grant execute on function public.focus_daily_totals(date, date, text) to authenticated;
