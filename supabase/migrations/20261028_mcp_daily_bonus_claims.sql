-- MCP daily bonus: one server-side grant shared by the website and the mobile app.
-- +10 once per calendar day in total (the user's own timezone, as today), whichever opens first.
--
-- What this does NOT change: monthly allowance, refill logic, credit costs, Pro gating.
-- Those stay in the existing live functions, which this file calls instead of copying:
--   public.mcp_is_pro(uuid), public.mcp_user_tz(uuid), public.mcp_touch_account(uuid), public.mcp_my_credits()
--
-- Review, then run once in the Supabase SQL editor. Safe to re-run.

begin;

-- 0. Stop early if the functions this relies on are missing or have changed shape.
do $$
begin
  if to_regprocedure('public.mcp_is_pro(uuid)') is null
     or to_regprocedure('public.mcp_user_tz(uuid)') is null
     or to_regprocedure('public.mcp_touch_account(uuid)') is null
     or to_regprocedure('public.mcp_my_credits()') is null then
    raise exception 'mcp bonus migration: expected MCP helper functions are missing';
  end if;

  -- Connected apps are read from Supabase Auth's OAuth grants (what the website's Settings shows).
  -- Check the columns this file reads exist, and that this role can read them.
  if (select count(*) from information_schema.columns
       where (table_schema, table_name, column_name) in (
         ('auth', 'oauth_consents', 'user_id'),
         ('auth', 'oauth_consents', 'client_id'),
         ('auth', 'oauth_consents', 'granted_at'),
         ('auth', 'oauth_consents', 'revoked_at'),
         ('auth', 'oauth_clients', 'id'),
         ('auth', 'oauth_clients', 'client_name'),
         ('auth', 'oauth_clients', 'deleted_at'))) <> 7 then
    raise exception 'mcp bonus migration: auth.oauth_consents / auth.oauth_clients columns differ from what this file expects';
  end if;
  if not has_table_privilege('auth.oauth_consents', 'select')
     or not has_table_privilege('auth.oauth_clients', 'select') then
    raise exception 'mcp bonus migration: this role cannot read the auth OAuth tables';
  end if;
end $$;

-- 1. One row per user per day. The primary key is what makes a second grant impossible.
create table if not exists public.mcp_daily_bonus_claims (
  user_id uuid not null references public.users(id) on delete cascade,
  claim_day date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, claim_day)
);

-- Only the functions below touch this table. RLS on with no policies blocks direct access.
alter table public.mcp_daily_bonus_claims enable row level security;
revoke all on table public.mcp_daily_bonus_claims from public, anon, authenticated;

-- Carry over bonuses already granted by the old function, so nobody gets a second +10 on the day this runs.
insert into public.mcp_daily_bonus_claims (user_id, claim_day)
select user_id, last_bonus_date
  from public.mcp_credit_accounts
 where last_bonus_date is not null
on conflict do nothing;

-- 2. Claim today's bonus.
create or replace function public.claim_daily_mcp_bonus()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cfg public.mcp_config;
  v_acct public.mcp_credit_accounts;
  v_today date;
  v_inserted boolean := false;
  v_summary jsonb;
begin
  -- Signed-in people only. Tokens issued to AI apps (they carry a client_id) can't claim.
  if v_user is null or (auth.jwt() ->> 'client_id') is not null then
    return jsonb_build_object('granted', false, 'amount', 0, 'balance', null,
                              'monthly_allowance', null, 'refill_date', null);
  end if;

  -- Same eligibility as before: active Pro, and credits have started (an app has been connected).
  if public.mcp_is_pro(v_user)
     and exists (select 1 from public.mcp_credit_accounts where user_id = v_user) then

    -- Same day definition as before: the user's stored timezone (default Asia/Kolkata).
    v_today := (now() at time zone public.mcp_user_tz(v_user))::date;

    -- Race-safe: a concurrent call waits on the key, then does nothing.
    insert into public.mcp_daily_bonus_claims (user_id, claim_day)
    values (v_user, v_today)
    on conflict (user_id, claim_day) do nothing;
    v_inserted := found;

    if v_inserted then
      select * into v_cfg from public.mcp_config limit 1;
      -- Rolls the monthly period if due (unchanged logic) and locks the row
      v_acct := public.mcp_touch_account(v_user);
      -- The balance may go above the monthly allowance through the bonus, as before
      update public.mcp_credit_accounts
         set balance = balance + v_cfg.daily_bonus, last_bonus_date = v_today, updated_at = now()
       where user_id = v_user
       returning * into v_acct;
      insert into public.mcp_credit_ledger (user_id, kind, delta, status, balance_after)
      values (v_user, 'bonus', v_cfg.daily_bonus, 'success', v_acct.balance);
    end if;
  end if;

  v_summary := public.mcp_my_credits();
  return jsonb_build_object(
    'granted', coalesce(v_inserted, false),
    'amount', case when coalesce(v_inserted, false) then v_cfg.daily_bonus else 0 end,
    'balance', v_summary -> 'balance',
    'monthly_allowance', v_summary -> 'monthly_credits',
    'refill_date', v_summary -> 'period_end'
  );
end $$;

-- 3. Read everything the credits screens need in one call.
create or replace function public.get_mcp_credit_summary()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_summary jsonb;
  v_today date;
  v_pro boolean;
  v_has_account boolean;
begin
  if v_user is null or (auth.jwt() ->> 'client_id') is not null then
    return null;
  end if;

  -- Never creates a credit account: without one, mcp_my_credits only reports the plan's allowance.
  v_summary := public.mcp_my_credits();
  v_today := (now() at time zone public.mcp_user_tz(v_user))::date;
  v_pro := coalesce((v_summary ->> 'is_pro')::boolean, false);
  v_has_account := coalesce((v_summary ->> 'has_account')::boolean, false);

  return jsonb_build_object(
    'is_pro', v_pro,
    'has_account', v_has_account,
    -- Pro before the first connection: show the full allowance (display only; the refill clock
    -- still starts on the first connection). Free users get no balance.
    'balance', case
                 when v_has_account then v_summary -> 'balance'
                 when v_pro then v_summary -> 'monthly_credits'
                 else null
               end,
    'monthly_allowance', v_summary -> 'monthly_credits',
    'refill_date', case when v_has_account then v_summary -> 'period_end' else null end,
    'bonus_claimed_today', exists (
      select 1 from public.mcp_daily_bonus_claims
       where user_id = v_user and claim_day = v_today
    ),
    -- Same list as the website's Settings > AI connections: active OAuth grants, minus any
    -- the user disconnected after granting (the website applies the same rule).
    'connected_apps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'client_id', g.client_id::text,
               'client_name', coalesce(nullif(btrim(cl.client_name), ''), mc.client_name),
               'connected_at', g.granted_at
             ) order by g.granted_at)
        from auth.oauth_consents g
        join auth.oauth_clients cl on cl.id = g.client_id
        left join public.mcp_connections mc
          on mc.user_id = g.user_id and mc.client_id = g.client_id::text
       where g.user_id = v_user
         and g.revoked_at is null
         and cl.deleted_at is null
         and (mc.revoked_at is null or mc.revoked_at < g.granted_at)
    ), '[]'::jsonb)
  );
end $$;

-- 4. The old claim function now goes through the new one, so there is a single grant path.
--    It keeps its old response shape for any website build that is still deployed.
create or replace function public.mcp_claim_daily_bonus()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  v := public.claim_daily_mcp_bonus();
  return jsonb_build_object(
    'claimed', coalesce((v ->> 'granted')::boolean, false),
    'amount', v -> 'amount',
    'balance', v -> 'balance'
  );
end $$;

-- 5. Who may run what: signed-in users only.
revoke all on function public.claim_daily_mcp_bonus()  from public, anon;
revoke all on function public.get_mcp_credit_summary() from public, anon;
revoke all on function public.mcp_claim_daily_bonus()  from public, anon;
grant execute on function public.claim_daily_mcp_bonus()  to authenticated;
grant execute on function public.get_mcp_credit_summary() to authenticated;
grant execute on function public.mcp_claim_daily_bonus()  to authenticated;

commit;
