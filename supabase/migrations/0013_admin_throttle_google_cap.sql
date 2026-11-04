-- 0013: additive. Admin wrong-token throttling + Google Places monthly hard cap.
-- All tables live in schema private (not exposed by PostgREST). Server-only RPCs require the
-- server-held ADMIN_TOKEN (same pattern as server_submit), so anon callers cannot use them.

create table if not exists private.admin_auth_failures (
  id bigserial primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index if not exists admin_auth_failures_ip_at on private.admin_auth_failures (ip_hash, at);
alter table private.admin_auth_failures enable row level security;

create table if not exists private.google_usage (
  month date primary key,
  requests integer not null default 0
);
alter table private.google_usage enable row level security;

create table if not exists private.google_ip_hits (
  id bigserial primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index if not exists google_ip_hits_ip_at on private.google_ip_hits (ip_hash, at);
alter table private.google_ip_hits enable row level security;

-- Returns the number of failed admin attempts for this IP hash in the window (after recording one if p_fail).
create or replace function public.server_admin_throttle(p_token text, p_ip_hash text, p_fail boolean, p_window_min integer default 15)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform private.check_admin(p_token);
  if p_ip_hash is null or length(p_ip_hash) < 16 then raise exception 'bad_ip'; end if;
  delete from private.admin_auth_failures where at < now() - interval '1 day';
  if p_fail then insert into private.admin_auth_failures (ip_hash) values (p_ip_hash); end if;
  select count(*) into n from private.admin_auth_failures
   where ip_hash = p_ip_hash and at > now() - make_interval(mins => greatest(coalesce(p_window_min, 15), 1));
  return n;
end $$;

-- Atomically reserves one Google request. Returns 'ok', 'cap' (monthly cap reached) or 'ip' (per-IP hourly limit).
create or replace function public.server_google_take(p_token text, p_ip_hash text, p_cap integer, p_ip_max integer default 20)
returns text language plpgsql security definer set search_path = '' as $$
declare m date := date_trunc('month', now() at time zone 'UTC')::date; used integer; ipn integer;
begin
  perform private.check_admin(p_token);
  if p_ip_hash is null or length(p_ip_hash) < 16 then raise exception 'bad_ip'; end if;
  delete from private.google_ip_hits where at < now() - interval '1 day';
  select count(*) into ipn from private.google_ip_hits where ip_hash = p_ip_hash and at > now() - interval '1 hour';
  if ipn >= greatest(coalesce(p_ip_max, 20), 1) then return 'ip'; end if;
  insert into private.google_usage (month, requests) values (m, 0) on conflict (month) do nothing;
  update private.google_usage set requests = requests + 1
   where month = m and requests < greatest(coalesce(p_cap, 0), 0)
   returning requests into used;
  if used is null then return 'cap'; end if;
  insert into private.google_ip_hits (ip_hash) values (p_ip_hash);
  return 'ok';
end $$;

create or replace function public.server_google_status(p_token text, p_cap integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_admin(p_token);
  return coalesce((select requests from private.google_usage where month = date_trunc('month', now() at time zone 'UTC')::date), 0) < greatest(coalesce(p_cap, 0), 0);
end $$;

create or replace function public.admin_google_usage(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_admin(p_token);
  return jsonb_build_object(
    'month', date_trunc('month', now() at time zone 'UTC')::date,
    'requests', coalesce((select requests from private.google_usage where month = date_trunc('month', now() at time zone 'UTC')::date), 0));
end $$;

revoke all on function public.server_admin_throttle(text, text, boolean, integer) from public;
revoke all on function public.server_google_take(text, text, integer, integer) from public;
revoke all on function public.server_google_status(text, integer) from public;
revoke all on function public.admin_google_usage(text) from public;
grant execute on function public.server_admin_throttle(text, text, boolean, integer) to anon, service_role;
grant execute on function public.server_google_take(text, text, integer, integer) to anon, service_role;
grant execute on function public.server_google_status(text, integer) to anon, service_role;
grant execute on function public.admin_google_usage(text) to anon, service_role;
