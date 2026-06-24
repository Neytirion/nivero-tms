-- Align DB permission matrix with app-level permissions.
-- Admin should not have project.delete; only owner can delete projects.

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
      'member.role.update',
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

-- Keep function executable for authenticated users.
grant execute on function public.has_project_permission(uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
