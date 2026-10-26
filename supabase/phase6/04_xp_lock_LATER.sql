-- Phase 6A: 04_xp_lock_LATER.sql
-- Server-side XP awarding function and log de-duplication.
-- NOTE: Written now, but DO NOT RUN until mobile app and web are fully migrated to use award_xp RPC.

alter table public.xp_logs add column if not exists ref_id text;

create unique index if not exists xp_logs_dedupe
  on public.xp_logs (user_id, source, ref_id) where ref_id is not null;

create or replace function public.award_xp(p_source text, p_ref_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amount int;
  v_new_xp int;
  v_level int;
  v_title text;
begin
  if v_uid is null then
    raise exception 'auth required';
  end if;

  -- Exact amounts from the XP module ported from mobile:
  -- Focus Session Complete: 10 XP
  -- Task Completed: 8 XP
  -- Habit Logged: 5 XP
  v_amount := case p_source
    when 'Focus Session Complete' then 10
    when 'Task Completed' then 8
    when 'Habit Logged' then 5
    else null
  end;

  if v_amount is null then
    raise exception 'unknown xp source';
  end if;

  insert into public.xp_logs (user_id, amount, source, ref_id)
  values (v_uid, v_amount, p_source, p_ref_id)
  on conflict do nothing;

  if not found then
    return 0; -- already awarded for this ref
  end if;

  perform set_config('focalyst.trusted', 'on', true);

  update public.users
     set total_xp = coalesce(total_xp, 0) + v_amount
   where id = v_uid
   returning total_xp into v_new_xp;

  -- Recompute current_level and current_title from LEVEL_BENCHMARKS
  v_level := case
    when v_new_xp >= 70000 then 15
    when v_new_xp >= 50000 then 14
    when v_new_xp >= 36000 then 13
    when v_new_xp >= 26000 then 12
    when v_new_xp >= 19000 then 11
    when v_new_xp >= 13500 then 10
    when v_new_xp >= 9500  then 9
    when v_new_xp >= 6500  then 8
    when v_new_xp >= 4000  then 7
    when v_new_xp >= 2500  then 6
    when v_new_xp >= 1400  then 5
    when v_new_xp >= 700   then 4
    when v_new_xp >= 300   then 3
    when v_new_xp >= 100   then 2
    else 1
  end;

  v_title := case v_level
    when 15 then 'Limitless'
    when 14 then 'Legend'
    when 13 then 'Apex'
    when 12 then 'Elite'
    when 11 then 'Mastery'
    when 10 then 'Strategist'
    when 9  then 'Achiever'
    when 8  then 'Operator'
    when 7  then 'Flow'
    when 6  then 'Focused'
    when 5  then 'Disciplined'
    when 4  then 'Practitioner'
    when 3  then 'Builder'
    when 2  then 'Momentum'
    else 'Ignition'
  end;

  update public.users
     set current_level = v_level,
         current_title = v_title
   where id = v_uid;

  return v_amount;
end;
$$;

revoke all on function public.award_xp(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;
