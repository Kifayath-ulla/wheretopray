-- Public contribute form moved to Google Forms. Keep the table and admin list;
-- drop the public insert path so anon/authenticated cannot call server_contribute.
revoke all on function public.server_contribute(text, text, text, text, text, text[], text, text) from public, anon, authenticated;
-- admin_list_contributors stays granted to anon (called with admin token from the Next API).
