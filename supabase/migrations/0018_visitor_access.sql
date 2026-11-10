-- 0018 visitor access: who can pray here, how to get in, opening hours, and when
-- someone actually confirmed access. Additive only: no data is changed or removed.
-- Being listed (status = 'verified') is not the same as confirmed access; that is
-- what access_confirmed_at records.

alter table public.places
  add column if not exists access text,
  add column if not exists access_notes text,
  add column if not exists opening_hours text,
  add column if not exists access_confirmed_at timestamptz;

do $$ begin
  alter table public.places add constraint places_access_chk
    check (access is null or access in ('public','customers','ask','private'));
exception when duplicate_object then null; end $$;

-- Approving a new place now also copies the visitor-access answers. Private or
-- permission-only spaces keep their access value only when the submitter said they
-- are authorised (the API already rejects them otherwise).
create or replace function public.admin_set_submission_status(p_token text, p_id uuid, p_status text)
returns public.submissions language plpgsql security definer set search_path = '' as $$
declare s public.submissions; pl jsonb; v_slug text; v_type text; v_lat float8; v_lng float8; v_access text;
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
      v_access := case
        when pl->>'access' in ('public','customers') then pl->>'access'
        when pl->>'access' in ('ask','private') and pl->>'authorized' = 'yes' then pl->>'access'
        else null end;
      insert into public.places (id, slug, name, type, lat, lng, address, area, women_section, wudu, parking, jumuah_time,
        access, access_notes, opening_hours,
        source, source_id, sources, source_ids, last_verified, status)
      values ('user-' || s.id, v_slug, left(pl->>'name',300), v_type, v_lat, v_lng, nullif(pl->>'address',''), nullif(pl->>'area',''),
        case when pl->>'women_section' = 'yes' then true end, case when pl->>'wudu' = 'yes' then true end,
        case when pl->>'parking' = 'yes' then true end, nullif(pl->>'jumuah_time',''),
        v_access, nullif(left(pl->>'access_notes',600),''), nullif(left(pl->>'opening_hours',200),''),
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

-- Admin: set visitor access for one place, and optionally mark it confirmed now
-- (p->>'confirm' = 'true') or clear the confirmation (p->>'confirm' = 'false').
create or replace function public.admin_set_access(p_token text, p_id text, p jsonb)
returns public.places language plpgsql security definer set search_path = '' as $$
declare r public.places;
begin
  perform private.check_admin(p_token);
  if p ? 'access' and nullif(p->>'access','') is not null and p->>'access' not in ('public','customers','ask','private') then
    raise exception 'bad access';
  end if;
  update public.places set
    access = case when p ? 'access' then nullif(p->>'access','') else access end,
    access_notes = case when p ? 'access_notes' then nullif(left(p->>'access_notes',600),'') else access_notes end,
    opening_hours = case when p ? 'opening_hours' then nullif(left(p->>'opening_hours',200),'') else opening_hours end,
    access_confirmed_at = case when p->>'confirm' = 'true' then now() when p->>'confirm' = 'false' then null else access_confirmed_at end,
    updated_at = now()
  where id = p_id returning * into r;
  return r;
end $$;

revoke all on function public.admin_set_access(text, text, jsonb) from public;
grant execute on function public.admin_set_access(text, text, jsonb) to anon, authenticated;
