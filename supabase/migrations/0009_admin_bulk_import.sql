-- Bulk import from the admin page: dedupe check and insert, both admin-token checked.
create or replace function public.admin_bulk_dedupe(p_token text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare out jsonb := '[]'::jsonb; r jsonb; i int := 0; m record;
begin
  perform private.check_admin(p_token);
  if jsonb_array_length(p_rows) > 2000 then raise exception 'too many rows'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    m := null;
    if (r->>'lat') is not null and (r->>'lng') is not null then
      select p.id, p.name, p.slug, p.status,
        extensions.st_distance(p.location, extensions.st_setsrid(extensions.st_makepoint((r->>'lng')::float8,(r->>'lat')::float8),4326)::extensions.geography) d
      into m from public.places p
      where extensions.st_dwithin(p.location, extensions.st_setsrid(extensions.st_makepoint((r->>'lng')::float8,(r->>'lat')::float8),4326)::extensions.geography, 400)
        and (extensions.st_dwithin(p.location, extensions.st_setsrid(extensions.st_makepoint((r->>'lng')::float8,(r->>'lat')::float8),4326)::extensions.geography, 40)
             or lower(regexp_replace(p.name,'[^a-zA-Z0-9]','','g')) = lower(regexp_replace(r->>'name','[^a-zA-Z0-9]','','g')))
      order by 5 limit 1;
    end if;
    if m.id is not null then
      out := out || jsonb_build_object('i', i, 'id', m.id, 'name', m.name, 'slug', m.slug, 'status', m.status, 'meters', round(m.d::numeric));
    end if;
    i := i + 1;
  end loop;
  return out;
end $$;

create or replace function public.admin_bulk_import(p_token text, p_rows jsonb, p_status text)
returns int language plpgsql security definer set search_path to '' as $$
declare r jsonb; n int := 0; v_slug text; v_id text; v_type text;
begin
  perform private.check_admin(p_token);
  if p_status not in ('pending','verified') then raise exception 'bad status'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'too many rows'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(trim(r->>'name'),'') = '' or (r->>'lat') is null or (r->>'lng') is null then continue; end if;
    if (r->>'lat')::float8 not between -90 and 90 or (r->>'lng')::float8 not between -180 and 180 then continue; end if;
    v_type := case when r->>'type' in ('mosque','dargah','idgah','musalla','prayer_room') then r->>'type' else 'mosque' end;
    v_id := 'bulk-' || replace(gen_random_uuid()::text,'-','');
    v_slug := left(trim(both '-' from regexp_replace(lower(r->>'name' || ' ' || coalesce(r->>'area', r->>'city', '')),'[^a-z0-9]+','-','g')),70);
    if v_slug = '' then v_slug := 'place'; end if;
    if exists (select 1 from public.places where slug = v_slug) then v_slug := v_slug || '-' || substr(v_id, 6, 6); end if;
    insert into public.places (id, slug, name, type, lat, lng, address, area, city, state, country, source, source_id, sources, source_ids, status)
    values (v_id, v_slug, left(trim(r->>'name'),300), v_type, (r->>'lat')::float8, (r->>'lng')::float8,
      nullif(left(r->>'address',500),''), nullif(left(r->>'area',120),''),
      coalesce(nullif(left(r->>'city',120),''),'Bengaluru'), coalesce(nullif(left(r->>'state',120),''),'Karnataka'), 'IN',
      'admin_bulk', v_id, array['admin_bulk'], jsonb_build_object('admin_bulk', jsonb_build_array(v_id)), p_status);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.admin_bulk_dedupe(text,jsonb) from public;
revoke all on function public.admin_bulk_import(text,jsonb,text) from public;
grant execute on function public.admin_bulk_dedupe(text,jsonb) to anon, service_role;
grant execute on function public.admin_bulk_import(text,jsonb,text) to anon, service_role;
