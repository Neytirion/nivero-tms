-- Phase 9: Remove project member with optional unfinished task unassign
-- Run after policies and invite_member_by_email.sql scripts.

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_unassign_unfinished_tasks boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_owner boolean;
  v_is_admin boolean;
  v_target_is_owner boolean;
  v_unfinished_count int;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) into v_is_owner;

  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = v_actor_id
      and pm.role = 'admin'
  ) into v_is_admin;

  if not v_is_owner and not v_is_admin then
    raise exception 'Only project owner or admin can remove members';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) into v_target_is_owner;

  if v_target_is_owner then
    raise exception 'Project owner cannot be removed';
  end if;

  select count(*)
  into v_unfinished_count
  from public.tasks t
  where t.project_id = p_project_id
    and t.assigned_to = p_user_id
    and lower(coalesce(t.status, '')) not in ('done', 'completed');

  if v_unfinished_count > 0 and not p_unassign_unfinished_tasks then
    raise exception 'Member has % unfinished task(s). Confirm removal with task unassign.', v_unfinished_count;
  end if;

  if p_unassign_unfinished_tasks then
    update public.tasks t
    set assigned_to = null,
        updated_at = now()
    where t.project_id = p_project_id
      and t.assigned_to = p_user_id
      and lower(coalesce(t.status, '')) not in ('done', 'completed');
  end if;

  delete from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;

  if not found then
    raise exception 'Member record not found';
  end if;
end;
$$;

revoke all on function public.remove_project_member(uuid, uuid, boolean) from public;
grant execute on function public.remove_project_member(uuid, uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
