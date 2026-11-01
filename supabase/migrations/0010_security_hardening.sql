-- Security hardening (2026-11-01). No data is changed or deleted.
-- 1. Least privilege on tables: anon/authenticated only need SELECT on places (RLS limits it to verified rows).
--    Submissions are written only through server_submit; admin reads go through token-checked RPCs.
revoke all on table public.places from anon, authenticated;
grant select on table public.places to anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke usage on schema private from anon, authenticated;

-- 2. Admin and server RPCs: callable only by anon (the server calls them with the anon key plus ADMIN_TOKEN).
--    Nobody signs in to this app, so authenticated and PUBLIC lose EXECUTE.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and (p.proname like 'admin\_%' or p.proname = 'server_submit')
  loop
    execute format('revoke all on function %s from public, authenticated', f.sig);
    execute format('grant execute on function %s to anon, service_role', f.sig);
  end loop;
end $$;

-- 3. Deny-all policies make the intent explicit (silences "RLS enabled, no policy").
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'no direct access' and polrelid = 'public.submissions'::regclass) then
    create policy "no direct access" on public.submissions for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policy where polname = 'no direct access' and polrelid = 'private.rate_events'::regclass) then
    create policy "no direct access" on private.rate_events for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policy where polname = 'no direct access' and polrelid = 'private.admin_secret'::regclass) then
    create policy "no direct access" on private.admin_secret for all to anon, authenticated using (false) with check (false);
  end if;
end $$;
