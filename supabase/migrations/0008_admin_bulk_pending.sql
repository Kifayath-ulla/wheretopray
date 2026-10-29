create or replace function public.admin_list_pending_places(p_token text, p_limit int default 500)
returns setof public.places language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  return query select * from public.places where status = 'pending' order by city, name limit least(coalesce(p_limit,500), 2000);
end $$;
create or replace function public.admin_bulk_set_place_status(p_token text, p_ids text[], p_status text)
returns int language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  perform private.check_admin(p_token);
  if p_status not in ('verified','pending','closed') then raise exception 'bad status'; end if;
  update public.places set status = p_status, updated_at = now() where id = any(p_ids);
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.admin_list_pending_places(text,int) from public;
revoke all on function public.admin_bulk_set_place_status(text,text[],text) from public;
grant execute on function public.admin_list_pending_places(text,int) to anon, service_role;
grant execute on function public.admin_bulk_set_place_status(text,text[],text) to anon, service_role;
