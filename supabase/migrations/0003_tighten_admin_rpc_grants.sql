-- Admin RPCs are only reachable via the anon key with a valid admin token (checked against private.admin_secret hash).
revoke execute on function public.admin_list_submissions(text), public.admin_set_submission_status(text, uuid, text), public.admin_delete_place(text, text) from authenticated;
grant insert (id) on public.submissions to anon, authenticated;
comment on table private.admin_secret is 'No policies on purpose: only SECURITY DEFINER functions read this table.';
