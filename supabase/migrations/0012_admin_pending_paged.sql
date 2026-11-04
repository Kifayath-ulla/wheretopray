-- Paged pending list (PostgREST caps responses at 1000 rows)
create or replace function public.admin_list_pending_places_paged(p_token text, p_limit int default 500, p_offset int default 0)
returns setof public.places language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  return query select * from public.places where status = 'pending'
    order by city, name, id
    limit least(greatest(coalesce(p_limit,500),1), 1000) offset greatest(coalesce(p_offset,0),0);
end $$;
create or replace function public.admin_count_pending_places(p_token text)
returns bigint language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  return (select count(*) from public.places where status = 'pending');
end $$;
revoke all on function public.admin_list_pending_places_paged(text,int,int) from public;
revoke all on function public.admin_count_pending_places(text) from public;
grant execute on function public.admin_list_pending_places_paged(text,int,int) to anon, service_role;
grant execute on function public.admin_count_pending_places(text) to anon, service_role;
