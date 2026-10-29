-- wheretopray live schema: places, submissions, admin RPCs (token-hash verified)
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop table if exists public.places cascade;
create table public.places (
  id text primary key,
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 300),
  name_local text,
  type text not null check (type in ('mosque','dargah','idgah','musalla','prayer_room')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point,4326) generated always as (extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326)::extensions.geography) stored,
  address text, area text,
  city text not null default 'Bengaluru', state text not null default 'Karnataka', country text not null default 'IN',
  denomination text, women_section boolean, wudu boolean, parking boolean, wheelchair boolean,
  phone text, website text, jumuah_time text, iqama_times jsonb,
  source text not null, source_id text not null,
  sources text[] not null default '{}', source_ids jsonb not null default '{}',
  last_verified timestamptz not null default now(),
  status text not null default 'verified' check (status in ('pending','verified','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index places_location_gix on public.places using gist (location);
create index places_city_idx on public.places (city);
create index places_status_idx on public.places (status);
alter table public.places enable row level security;
create policy "public read verified places" on public.places for select to anon, authenticated using (status = 'verified');
grant select on public.places to anon, authenticated;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new_place','fix')),
  place_id text check (place_id is null or char_length(place_id) <= 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.submissions enable row level security;
create policy "anyone can submit pending" on public.submissions for insert to anon, authenticated
  with check (status = 'pending' and reviewed_at is null);
grant insert (kind, place_id, payload) on public.submissions to anon, authenticated;

create table private.admin_secret (id int primary key default 1 check (id = 1), token_hash text not null);
alter table private.admin_secret enable row level security;

create or replace function private.check_admin(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (select 1 from private.admin_secret
     where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end $$;
revoke all on function private.check_admin(text) from public, anon, authenticated;

create or replace function public.admin_list_submissions(p_token text)
returns setof public.submissions language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_admin(p_token);
  return query select * from public.submissions order by created_at desc limit 500;
end $$;

create or replace function public.admin_set_submission_status(p_token text, p_id uuid, p_status text)
returns public.submissions language plpgsql security definer set search_path = '' as $$
declare s public.submissions; pl jsonb; v_slug text; v_type text; v_lat float8; v_lng float8;
begin
  perform private.check_admin(p_token);
  if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
  update public.submissions set status = p_status, reviewed_at = now() where id = p_id returning * into s;
  if s.id is null then return null; end if;
  if p_status = 'approved' then
    pl := s.payload;
    if s.kind = 'new_place' then
      v_lat := nullif(pl->>'lat','')::float8; v_lng := nullif(pl->>'lng','')::float8;
      if coalesce(pl->>'name','') = '' or v_lat is null or v_lng is null then raise exception 'name, lat, lng required'; end if;
      v_slug := left(trim(both '-' from regexp_replace(lower(pl->>'name'), '[^a-z0-9]+', '-', 'g')), 60);
      if v_slug = '' then v_slug := 'place'; end if;
      if exists (select 1 from public.places where slug = v_slug) then v_slug := v_slug || '-' || left(s.id::text, 6); end if;
      v_type := case when pl->>'type' in ('mosque','dargah','idgah','musalla','prayer_room') then pl->>'type' else 'mosque' end;
      insert into public.places (id, slug, name, type, lat, lng, address, area, women_section, wudu, parking, jumuah_time,
        source, source_id, sources, source_ids, last_verified, status)
      values ('user-' || s.id, v_slug, left(pl->>'name',300), v_type, v_lat, v_lng, nullif(pl->>'address',''), nullif(pl->>'area',''),
        case when pl->>'women_section' = 'yes' then true end, case when pl->>'wudu' = 'yes' then true end,
        case when pl->>'parking' = 'yes' then true end, nullif(pl->>'jumuah_time',''),
        'user', s.id::text, array['user'], jsonb_build_object('user', jsonb_build_array(s.id::text)), now(), 'verified')
      on conflict (id) do update set status = 'verified', updated_at = now();
    elsif s.kind = 'fix' and s.place_id is not null then
      if pl->>'issue' = 'Permanently closed' then
        update public.places set status = 'closed', updated_at = now() where id = s.place_id;
      else
        update public.places set
          name = coalesce(nullif(pl->>'name',''), name), address = coalesce(nullif(pl->>'address',''), address),
          jumuah_time = coalesce(nullif(pl->>'jumuah_time',''), jumuah_time), phone = coalesce(nullif(pl->>'phone',''), phone),
          website = coalesce(nullif(pl->>'website',''), website),
          lat = coalesce(nullif(pl->>'lat','')::float8, lat), lng = coalesce(nullif(pl->>'lng','')::float8, lng),
          last_verified = now(), updated_at = now()
        where id = s.place_id;
      end if;
    end if;
  end if;
  return s;
end $$;

create or replace function public.admin_delete_place(p_token text, p_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_admin(p_token);
  delete from public.places where id = p_id;
  return found;
end $$;

revoke all on function public.admin_list_submissions(text) from public;
revoke all on function public.admin_set_submission_status(text, uuid, text) from public;
revoke all on function public.admin_delete_place(text, text) from public;
grant execute on function public.admin_list_submissions(text) to anon, authenticated;
grant execute on function public.admin_set_submission_status(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_place(text, text) to anon, authenticated;
