-- wheretopray: places + submissions (Supabase / PostGIS)
create extension if not exists postgis;

create type place_type as enum ('mosque','dargah','idgah','musalla','prayer_room');
create type place_status as enum ('pending','verified');

create table places (
  id text primary key,
  slug text unique not null,
  name text not null,
  name_local text,
  type place_type not null,
  geom geography(Point, 4326) not null,
  lat double precision generated always as (st_y(geom::geometry)) stored,
  lng double precision generated always as (st_x(geom::geometry)) stored,
  address text, area text, city text not null, state text, country text not null default 'IN',
  denomination text,
  women_section boolean, wudu boolean, parking boolean, wheelchair boolean,
  phone text, website text, jumuah_time text, iqama_times jsonb,
  source text not null, source_id text not null,
  last_verified timestamptz not null default now(),
  status place_status not null default 'pending',
  unique (source, source_id)
);
create index places_geom_idx on places using gist (geom);
create index places_city_idx on places (city);
create index places_name_trgm on places using gin (name gin_trgm_ops);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new_place','fix')),
  place_id text references places(id),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- near me: select * from places_near(12.97, 77.59, 3000);
create or replace function places_near(lat double precision, lng double precision, radius_m int default 5000)
returns setof places language sql stable as $$
  select * from places
  where st_dwithin(geom, st_makepoint(lng, lat)::geography, radius_m)
  order by geom <-> st_makepoint(lng, lat)::geography;
$$;

alter table places enable row level security;
create policy "public read verified" on places for select using (status = 'verified');
alter table submissions enable row level security;
create policy "public insert" on submissions for insert with check (status = 'pending');
