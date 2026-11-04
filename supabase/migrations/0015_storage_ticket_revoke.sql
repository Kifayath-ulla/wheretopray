-- 0015: revoke storage tickets right after use so a path is only reachable during the server's own request.
create or replace function public.server_storage_ticket_revoke(p_token text, p_path text)
 returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.check_admin(p_token);
  delete from private.storage_tickets where path = p_path or expires_at < now();
end $$;
revoke all on function public.server_storage_ticket_revoke(text,text) from public, authenticated;
grant execute on function public.server_storage_ticket_revoke(text,text) to anon, service_role;
