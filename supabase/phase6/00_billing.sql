alter table public.users add column if not exists billing_provider text;   -- 'polar' | 'apple' | 'google' | null
alter table public.users add column if not exists polar_customer_id text;

create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
