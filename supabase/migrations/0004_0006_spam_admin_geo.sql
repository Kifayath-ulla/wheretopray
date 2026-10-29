-- 0004-0007: rate limit table, admin search/edit/delete, geo RPCs, city list, submission location trigger,
-- server-only rate-limited submit. Dumped from the live Supabase database on 2026-10-29.

create table if not exists private.rate_events (id bigserial primary key, ip_hash text not null, action text not null, at timestamptz not null default now());
create index if not exists rate_events_idx on private.rate_events (ip_hash, action, at);
revoke insert on public.submissions from anon, authenticated;

CREATE OR REPLACE FUNCTION private.after_approve_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pl jsonb;
begin
  if new.source = 'user' then
    select payload into pl from public.submissions where id::text = new.source_id;
    if pl is not null then
      new.city := coalesce(nullif(left(pl->>'city',120),''), new.city);
      new.state := coalesce(nullif(left(pl->>'state',120),''), new.state);
      new.country := coalesce(nullif(upper(left(pl->>'country',2)),''), new.country);
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_place(p_token text, p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.check_admin(p_token);
  delete from public.places where id = p_id;
  return found;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_search_places(p_token text, p_q text, p_limit integer DEFAULT 50)
 RETURNS SETOF places
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.check_admin(p_token);
  return query select * from public.places where p_q is null or p_q = '' or name ilike '%'||p_q||'%' or coalesce(area,'') ilike '%'||p_q||'%' or city ilike '%'||p_q||'%' or id = p_q
    order by name limit least(greatest(p_limit,1),200);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_update_place(p_token text, p_id text, p jsonb)
 RETURNS places
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.places;
begin
  perform private.check_admin(p_token);
  update public.places set
    name = coalesce(nullif(left(p->>'name',300),''), name),
    type = case when p->>'type' in ('mosque','dargah','idgah','musalla','prayer_room') then p->>'type' else type end,
    address = case when p ? 'address' then nullif(left(p->>'address',500),'') else address end,
    area = case when p ? 'area' then nullif(left(p->>'area',120),'') else area end,
    city = coalesce(nullif(left(p->>'city',120),''), city),
    state = coalesce(nullif(left(p->>'state',120),''), state),
    country = coalesce(nullif(left(p->>'country',2),''), country),
    lat = coalesce(nullif(p->>'lat','')::float8, lat), lng = coalesce(nullif(p->>'lng','')::float8, lng),
    women_section = case when p ? 'women_section' then (p->>'women_section')::boolean else women_section end,
    wudu = case when p ? 'wudu' then (p->>'wudu')::boolean else wudu end,
    parking = case when p ? 'parking' then (p->>'parking')::boolean else parking end,
    wheelchair = case when p ? 'wheelchair' then (p->>'wheelchair')::boolean else wheelchair end,
    jumuah_time = case when p ? 'jumuah_time' then nullif(left(p->>'jumuah_time',40),'') else jumuah_time end,
    status = case when p->>'status' in ('pending','verified','closed') then p->>'status' else status end,
    last_verified = now(), updated_at = now()
  where id = p_id returning * into r;
  return r;
end $function$;

CREATE OR REPLACE FUNCTION public.place_cities()
 RETURNS TABLE(state text, city text, n bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.state, p.city, count(*) from public.places p where p.status = 'verified' group by 1,2 order by 1,2;
$function$;

CREATE OR REPLACE FUNCTION public.place_cities_json()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select coalesce(jsonb_agg(jsonb_build_object('state',state,'city',city,'n',n) order by n desc),'[]'::jsonb) from public.place_cities() $function$;

CREATE OR REPLACE FUNCTION public.places_in_bbox(p_west double precision, p_south double precision, p_east double precision, p_north double precision, p_limit integer DEFAULT 2000)
 RETURNS TABLE(id text, slug text, name text, type text, lat double precision, lng double precision, area text, city text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.id, p.slug, p.name, p.type, p.lat, p.lng, p.area, p.city from public.places p
  where p.status = 'verified' and p.lat between p_south and p_north and p.lng between p_west and p_east
  limit least(greatest(p_limit,1),5000);
$function$;

CREATE OR REPLACE FUNCTION public.places_near(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 5, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, slug text, name text, type text, lat double precision, lng double precision, address text, area text, city text, state text, distance_km double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.id, p.slug, p.name, p.type, p.lat, p.lng, p.address, p.area, p.city, p.state,
    extensions.st_distance(p.location, extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography)/1000.0
  from public.places p
  where p.status = 'verified' and extensions.st_dwithin(p.location, extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography, least(p_radius_km,50)*1000)
  order by 11 limit least(greatest(p_limit,1),500) offset greatest(p_offset,0);
$function$;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_ip_hash text, p_action text, p_max integer DEFAULT 5, p_window_minutes integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 or length(p_ip_hash) > 128 then raise exception 'bad ip hash'; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  select count(*) into n from private.rate_events where ip_hash = p_ip_hash and action = left(p_action,20) and at > now() - make_interval(mins => least(greatest(p_window_minutes,1),1440));
  if n >= least(greatest(p_max,1),50) then return false; end if;
  insert into private.rate_events(ip_hash, action) values (p_ip_hash, left(p_action,20));
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.server_submit(p_token text, p_ip_hash text, p_kind text, p_place_id text, p_payload jsonb, p_max integer DEFAULT 5)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid := gen_random_uuid(); n int;
begin
  perform private.check_admin(p_token);
  if p_kind not in ('new_place','fix') then raise exception 'bad kind'; end if;
  if p_ip_hash is null or length(p_ip_hash) < 16 then raise exception 'bad ip hash'; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  select count(*) into n from private.rate_events where ip_hash = p_ip_hash and action = 'submit' and at > now() - interval '1 hour';
  if n >= least(greatest(p_max,1),50) then raise exception 'rate_limited' using errcode = 'P0429'; end if;
  insert into private.rate_events(ip_hash, action) values (p_ip_hash, 'submit');
  insert into public.submissions (id, kind, place_id, payload) values (v_id, p_kind, left(p_place_id,100), p_payload);
  return v_id;
end $function$;

drop trigger if exists places_user_location on public.places;
CREATE TRIGGER places_user_location BEFORE INSERT ON public.places FOR EACH ROW EXECUTE FUNCTION private.after_approve_location();

revoke all on function public.admin_delete_place from public, anon, authenticated;
revoke all on function public.admin_search_places from public, anon, authenticated;
revoke all on function public.admin_update_place from public, anon, authenticated;
revoke all on function public.place_cities from public, anon, authenticated;
revoke all on function public.place_cities_json from public, anon, authenticated;
revoke all on function public.places_in_bbox from public, anon, authenticated;
revoke all on function public.places_near from public, anon, authenticated;
revoke all on function public.rate_limit_hit from public, anon, authenticated;
revoke all on function public.server_submit from public, anon, authenticated;
grant execute on function public.admin_delete_place to anon;
grant execute on function public.admin_delete_place to service_role;
grant execute on function public.admin_search_places to anon;
grant execute on function public.admin_search_places to service_role;
grant execute on function public.admin_update_place to anon;
grant execute on function public.admin_update_place to service_role;
grant execute on function public.place_cities to anon;
grant execute on function public.place_cities to authenticated;
grant execute on function public.place_cities to service_role;
grant execute on function public.place_cities_json to anon;
grant execute on function public.place_cities_json to authenticated;
grant execute on function public.place_cities_json to service_role;
grant execute on function public.places_in_bbox to anon;
grant execute on function public.places_in_bbox to authenticated;
grant execute on function public.places_in_bbox to service_role;
grant execute on function public.places_near to anon;
grant execute on function public.places_near to authenticated;
grant execute on function public.places_near to service_role;
grant execute on function public.rate_limit_hit to service_role;
grant execute on function public.server_submit to anon;
grant execute on function public.server_submit to service_role;
