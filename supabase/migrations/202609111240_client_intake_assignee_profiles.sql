-- Expose only display names needed by the public client intake history.
-- The RPC is callable by the service-role Edge Function only.

create or replace function public.get_client_intake_assignee_profiles(p_project_id uuid)
returns table(user_id uuid, display_name text)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(u.email::text, ''), '@', 1),
      'Unknown user'
    )::text
  from auth.users u
  where exists (
    select 1
    from public.tasks t
    where t.project_id = p_project_id
      and t.assigned_to = u.id
  );
$$;

revoke all on function public.get_client_intake_assignee_profiles(uuid) from public, anon, authenticated;
grant execute on function public.get_client_intake_assignee_profiles(uuid) to service_role;

notify pgrst, 'reload schema';
