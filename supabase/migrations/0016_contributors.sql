-- Volunteer sign-ups. No public read. Inserts only through the server RPC (server-held admin token + IP-hash rate limit).
create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 80),
  email text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  help text[] not null default '{}' check (help <@ array['places','timetables','tech','translate','spread','other']::text[]),
  note text check (note is null or length(note) <= 1000),
  city text check (city is null or length(city) <= 80)
);
alter table public.contributors enable row level security;
revoke all on public.contributors from public, anon, authenticated;

create or replace function public.server_contribute(p_token text, p_ip_hash text, p_name text, p_email text, p_phone text, p_help text[], p_note text, p_city text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; n int;
begin
  perform private.check_admin(p_token);
  if p_ip_hash is null or length(p_ip_hash) < 16 then raise exception 'bad ip hash'; end if;
  p_name := btrim(p_name); p_email := lower(btrim(p_email)); p_phone := nullif(btrim(coalesce(p_phone,'')),''); p_note := nullif(btrim(coalesce(p_note,'')),''); p_city := nullif(btrim(coalesce(p_city,'')),'');
  if p_name is null or length(p_name) not between 1 and 80 then raise exception 'bad name'; end if;
  if p_email is null or length(p_email) > 254 or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad email'; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  select count(*) into n from private.rate_events where ip_hash = p_ip_hash and action = 'contribute' and at > now() - interval '1 hour';
  if n >= 3 then raise exception 'rate_limited' using errcode = 'P0429'; end if;
  insert into private.rate_events(ip_hash, action) values (p_ip_hash, 'contribute');
  insert into public.contributors(name, email, phone, help, note, city)
  values (p_name, p_email, p_phone, coalesce(p_help,'{}'), left(p_note,1000), left(p_city,80)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.server_contribute(text,text,text,text,text,text[],text,text) from public, authenticated;
grant execute on function public.server_contribute(text,text,text,text,text,text[],text,text) to anon, service_role;

create or replace function public.admin_list_contributors(p_token text)
returns setof public.contributors language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  return query select * from public.contributors order by created_at desc limit 500;
end $$;
revoke all on function public.admin_list_contributors(text) from public, authenticated;
grant execute on function public.admin_list_contributors(text) to anon, service_role;
