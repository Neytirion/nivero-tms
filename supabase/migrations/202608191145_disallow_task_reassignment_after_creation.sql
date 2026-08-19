-- Disallow changing task assignee after task creation.
-- Assignee can be set only at INSERT time.

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
    if new.assigned_to is distinct from old.assigned_to then
      raise exception 'Assignee can only be set during task creation';
    end if;

    return new;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
