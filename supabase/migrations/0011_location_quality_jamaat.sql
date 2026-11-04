-- 0011: location quality flag + community jamaat times editable by admin. Additive only; anon grants unchanged.
alter table public.places add column if not exists location_quality text
  check (location_quality in ('exact','listing','approximate'));
comment on column public.places.location_quality is
  'exact = mapped building/point from OpenStreetMap or set by an admin; listing = pin from a business listing (Overture/Wikidata), usually within ~100 m; approximate = coarse source, low precision or shared/snapped coordinates';

update public.places p set location_quality = case
  when 'osm' = any(coalesce(p.sources, array[p.source])) then 'exact'
  when p.source = 'geonames'
    or (round(p.lat::numeric,4) = p.lat::numeric and round(p.lng::numeric,4) = p.lng::numeric)
    or exists (select 1 from public.places q where q.id <> p.id and q.lat = p.lat and q.lng = p.lng)
    then 'approximate'
  else 'listing' end
where p.location_quality is null;

CREATE OR REPLACE FUNCTION public.admin_update_place(p_token text, p_id text, p jsonb)
 RETURNS places LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare r public.places; t jsonb;
begin
  perform private.check_admin(p_token);
  -- Only keep known prayer keys with HH:MM values.
  if p ? 'iqama_times' and jsonb_typeof(p->'iqama_times') = 'object' then
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into t
    from jsonb_each_text(p->'iqama_times') e(k, v)
    where k in ('fajr','zuhr','asr','maghrib','isha','jumuah') and v ~ '^([01]?\d|2[0-3]):[0-5]\d$';
  end if;
  update public.places set
    name = coalesce(nullif(left(p->>'name',300),''), name),
    type = case when p->>'type' in ('mosque','dargah','idgah','musalla','prayer_room') then p->>'type' else type end,
    address = case when p ? 'address' then nullif(left(p->>'address',500),'') else address end,
    area = case when p ? 'area' then nullif(left(p->>'area',120),'') else area end,
    city = coalesce(nullif(left(p->>'city',120),''), city),
    state = coalesce(nullif(left(p->>'state',120),''), state),
    country = coalesce(nullif(left(p->>'country',2),''), country),
    lat = coalesce(nullif(p->>'lat','')::float8, lat), lng = coalesce(nullif(p->>'lng','')::float8, lng),
    location_quality = case when nullif(p->>'lat','') is not null or nullif(p->>'lng','') is not null then 'exact'
                            when p->>'location_quality' in ('exact','listing','approximate') then p->>'location_quality'
                            else location_quality end,
    women_section = case when p ? 'women_section' then (p->>'women_section')::boolean else women_section end,
    wudu = case when p ? 'wudu' then (p->>'wudu')::boolean else wudu end,
    parking = case when p ? 'parking' then (p->>'parking')::boolean else parking end,
    wheelchair = case when p ? 'wheelchair' then (p->>'wheelchair')::boolean else wheelchair end,
    jumuah_time = case when p ? 'jumuah_time' then nullif(left(p->>'jumuah_time',40),'') else jumuah_time end,
    iqama_times = case when t is null then iqama_times when t = '{}'::jsonb then null else t end,
    status = case when p->>'status' in ('pending','verified','closed') then p->>'status' else status end,
    last_verified = now(), updated_at = now()
  where id = p_id returning * into r;
  return r;
end $function$;
