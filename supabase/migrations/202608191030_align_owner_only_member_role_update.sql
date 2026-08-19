-- Align DB role-update permissions with frontend:
-- only project owner can change member roles.

create or replace function public.has_project_permission(
  p_project_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.get_project_role_for_user(p_project_id, p_user_id);
  v_permission text := lower(coalesce(p_permission, ''));
begin
  if v_role is null or v_permission = '' then
    return false;
  end if;

  if v_role = 'owner' then
    return true;
  end if;

  if v_role = 'admin' then
    return v_permission in (
      'project.manage',
      'project.invite',
      'project.complete',
      'member.remove',
      'task.assign',
      'task.manage.any',
      'task.manage.own',
      'task.delete.any',
      'task.delete.own'
    );
  end if;

  if v_role = 'member' then
    return v_permission in (
      'project.invite',
      'task.manage.own',
      'task.delete.own'
    );
  end if;

  if v_role = 'manager' then
    return v_permission in (
      'project.manage',
      'project.invite',
      'project.complete',
      'task.assign',
      'task.manage.any',
      'task.manage.own',
      'task.delete.any',
      'task.delete.own'
    );
  end if;

  return false;
end;
$$;

revoke all on function public.has_project_permission(uuid, text, uuid) from public;
revoke execute on function public.has_project_permission(uuid, text, uuid) from anon;
grant execute on function public.has_project_permission(uuid, text, uuid) to authenticated;

create or replace function public.update_project_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role text := lower(coalesce(nullif(trim(p_role), ''), 'member'));
  v_actor_is_owner boolean;
  v_target_is_owner boolean;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('member', 'manager', 'admin') then
    raise exception 'Invalid role';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) into v_actor_is_owner;

  if not v_actor_is_owner then
    raise exception 'Only project owner can update member roles';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) into v_target_is_owner;

  if v_target_is_owner then
    raise exception 'Project owner role cannot be changed';
  end if;

  update public.project_members pm
  set role = v_role
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;

  if not found then
    raise exception 'Member record not found';
  end if;
end;
$$;

revoke all on function public.update_project_member_role(uuid, uuid, text) from public;
revoke execute on function public.update_project_member_role(uuid, uuid, text) from anon;
grant execute on function public.update_project_member_role(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
