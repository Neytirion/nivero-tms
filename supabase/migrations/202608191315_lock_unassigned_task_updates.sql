-- Disallow editing unassigned tasks.
-- The only allowed update on unassigned tasks is claiming it by setting
-- assigned_to from null to auth.uid().

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
      raise exception 'Permission denied: only project members can assign tasks';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.assigned_to is null then
      if new.assigned_to is null then
        raise exception 'Unassigned task must be taken before editing';
      end if;

      if new.assigned_to <> v_actor_id then
        raise exception 'Only unassigned tasks can be taken by yourself';
      end if;

      if new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.status is distinct from old.status
        or new.priority is distinct from old.priority
        or new.work_package_id is distinct from old.work_package_id
        or new.estimate_hours is distinct from old.estimate_hours
        or new.actual_hours is distinct from old.actual_hours
        or new.blocked_by_task_id is distinct from old.blocked_by_task_id
        or new.due_date is distinct from old.due_date
      then
        raise exception 'Unassigned task must be taken before editing';
      end if;

      return new;
    end if;

    if new.assigned_to is distinct from old.assigned_to then
      raise exception 'Only unassigned tasks can be taken by yourself';
    end if;

    return new;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';