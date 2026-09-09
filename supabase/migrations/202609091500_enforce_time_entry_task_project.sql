-- Enforce that a time entry task belongs to the same project.

create or replace function public.validate_time_entry_task_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_project_id uuid;
begin
  if new.task_id is null then
    return new;
  end if;

  select t.project_id
  into v_task_project_id
  from public.tasks t
  where t.id = new.task_id;

  if v_task_project_id is null then
    raise exception 'Invalid task_id: task not found';
  end if;

  if v_task_project_id <> new.project_id then
    raise exception 'Task and project mismatch in time entry';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_time_entry_task_project on public.time_entries;

create trigger trg_validate_time_entry_task_project
before insert or update of project_id, task_id on public.time_entries
for each row
execute function public.validate_time_entry_task_project();

revoke all on function public.validate_time_entry_task_project() from public, anon, authenticated;

notify pgrst, 'reload schema';
