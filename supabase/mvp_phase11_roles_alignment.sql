-- Phase 11: Align frontend/backend role matrix and task assignment behavior.
-- Safe to run on top of existing Phase 10 deployment.

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
      'project.delete',
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

create or replace function public.enforce_task_assignment_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if tg_op = 'INSERT' then
    if new.assigned_to is not null
      and new.assigned_to <> v_actor_id
      and not public.has_project_permission(new.project_id, 'task.assign', v_actor_id) then
      raise exception 'Permission denied: only owner, admin, or manager can assign tasks';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.assigned_to is distinct from old.assigned_to
      and new.assigned_to is not null
      and new.assigned_to <> v_actor_id
      and not public.has_project_permission(new.project_id, 'task.assign', v_actor_id) then
      raise exception 'Permission denied: only owner, admin, or manager can assign tasks';
    end if;

    return new;
  end if;

  return new;
end;
$$;
