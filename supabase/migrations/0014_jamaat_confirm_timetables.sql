-- 0014: jamaat "still correct?" confirmations + timetable submissions (link or private photo).
-- anon gets no new table writes; everything goes through SECURITY DEFINER RPCs that check the server-held admin token.

alter table public.places add column if not exists jamaat_confirmed_at timestamptz;

-- Any change to the jamaat fields (admin edit) counts as a fresh confirmation.
create or replace function private.touch_jamaat_confirmed() returns trigger language plpgsql set search_path to '' as $$
begin
  if (new.iqama_times is distinct from old.iqama_times or new.jumuah_time is distinct from old.jumuah_time) then
    new.jamaat_confirmed_at := case when new.iqama_times is null and new.jumuah_time is null then null else now() end;
  end if;
  return new;
end $$;
drop trigger if exists places_touch_jamaat on public.places;
create trigger places_touch_jamaat before update of iqama_times, jumuah_time on public.places
  for each row execute function private.touch_jamaat_confirmed();

-- "Yes, still correct": 1 per place per IP-hash per day, 20 per IP-hash per hour overall.
create or replace function public.server_confirm_jamaat(p_token text, p_ip_hash text, p_place_id text)
 returns timestamptz language plpgsql security definer set search_path to '' as $$
declare n int; v timestamptz;
begin
  perform private.check_admin(p_token);
  if p_ip_hash is null or length(p_ip_hash) < 16 or p_place_id is null or length(p_place_id) > 100 then raise exception 'bad input'; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  if exists (select 1 from private.rate_events where ip_hash = p_ip_hash and action = 'confirm:' || p_place_id) then
    raise exception 'already_confirmed' using errcode = 'P0409';
  end if;
  select count(*) into n from private.rate_events where ip_hash = p_ip_hash and action like 'confirm:%' and at > now() - interval '1 hour';
  if n >= 20 then raise exception 'rate_limited' using errcode = 'P0429'; end if;
  update public.places set jamaat_confirmed_at = now()
   where id = p_place_id and status = 'verified' and (iqama_times is not null or jumuah_time is not null)
   returning jamaat_confirmed_at into v;
  if v is null then raise exception 'no_times'; end if;
  insert into private.rate_events(ip_hash, action) values (p_ip_hash, 'confirm:' || p_place_id);
  return v;
end $$;
revoke all on function public.server_confirm_jamaat(text,text,text) from public, authenticated;
grant execute on function public.server_confirm_jamaat(text,text,text) to anon, service_role;

-- Timetable submissions reuse the moderation queue.
alter table public.submissions drop constraint if exists submissions_kind_check;
alter table public.submissions add constraint submissions_kind_check check (kind in ('new_place','fix','timetable'));

CREATE OR REPLACE FUNCTION public.server_submit(p_token text, p_ip_hash text, p_kind text, p_place_id text, p_payload jsonb, p_max integer DEFAULT 5)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_id uuid := gen_random_uuid(); n int;
begin
  perform private.check_admin(p_token);
  if p_kind not in ('new_place','fix','timetable') then raise exception 'bad kind'; end if;
  if p_ip_hash is null or length(p_ip_hash) < 16 then raise exception 'bad ip hash'; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  select count(*) into n from private.rate_events where ip_hash = p_ip_hash and action = 'submit' and at > now() - interval '1 hour';
  if n >= least(greatest(p_max,1),50) then raise exception 'rate_limited' using errcode = 'P0429'; end if;
  insert into private.rate_events(ip_hash, action) values (p_ip_hash, 'submit');
  insert into public.submissions (id, kind, place_id, payload) values (v_id, p_kind, left(p_place_id,100), p_payload);
  return v_id;
end $function$;
revoke all on function public.server_submit(text,text,text,text,jsonb,integer) from public, authenticated;
grant execute on function public.server_submit(text,text,text,text,jsonb,integer) to anon, service_role;

-- Private photo bucket: 2 MB, jpg/png/webp only, no public URLs, no listing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('timetables', 'timetables', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

-- Short-lived single-path tickets issued only by the server (admin token). Storage policies check them.
create table if not exists private.storage_tickets (
  path text not null, op text not null check (op in ('write','read')), expires_at timestamptz not null,
  primary key (path, op));
revoke all on private.storage_tickets from public, anon, authenticated;

create or replace function public.server_storage_ticket(p_token text, p_path text, p_op text)
 returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  if p_op not in ('write','read') or p_path !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' then raise exception 'bad input'; end if;
  delete from private.storage_tickets where expires_at < now();
  insert into private.storage_tickets values (p_path, p_op, now() + interval '2 minutes')
    on conflict (path, op) do update set expires_at = excluded.expires_at;
end $$;
revoke all on function public.server_storage_ticket(text,text,text) from public, authenticated;
grant execute on function public.server_storage_ticket(text,text,text) to anon, service_role;

create or replace function public.storage_ticket_ok(p_path text, p_op text) returns boolean
 language sql stable security definer set search_path to '' as $$
  select exists (select 1 from private.storage_tickets where path = p_path and op = p_op and expires_at > now());
$$;
revoke all on function public.storage_ticket_ok(text,text) from public;
grant execute on function public.storage_ticket_ok(text,text) to anon, authenticated, service_role;

drop policy if exists "timetables ticket insert" on storage.objects;
create policy "timetables ticket insert" on storage.objects for insert to anon
  with check (bucket_id = 'timetables' and public.storage_ticket_ok(name, 'write'));
drop policy if exists "timetables ticket read" on storage.objects;
create policy "timetables ticket read" on storage.objects for select to anon
  using (bucket_id = 'timetables' and public.storage_ticket_ok(name, 'read'));
