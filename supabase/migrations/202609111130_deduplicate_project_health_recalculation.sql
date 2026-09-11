-- Avoid repeated full project-health recalculations from overlapping row triggers.
-- Keep task actual-hours maintenance, but do not let that maintenance recurse
-- into project-health recalculation.

create or replace function public.refresh_project_health_after_time_entry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_task_actual_hours(old.task_id);
    perform public.recalc_project_health(old.project_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.task_id is distinct from new.task_id then
    perform public.recalculate_task_actual_hours(old.task_id);
  end if;

  perform public.recalculate_task_actual_hours(new.task_id);

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform public.recalc_project_health(old.project_id);
  end if;

  perform public.recalc_project_health(new.project_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_after_task_change on public.tasks;
drop trigger if exists trg_tasks_progress_rollup on public.tasks;
drop trigger if exists trg_sync_after_time_entry_change on public.time_entries;
drop trigger if exists trg_time_entries_rollup on public.time_entries;

drop trigger if exists trg_tasks_project_health on public.tasks;
create trigger trg_tasks_project_health
after insert or delete or update of project_id, status, estimate_hours, due_date, blocked_by_task_id, work_package_id
on public.tasks
for each row execute function public.refresh_project_health_after_task_change();

drop trigger if exists trg_time_entries_project_health on public.time_entries;
create trigger trg_time_entries_project_health
after insert or delete or update of project_id, task_id, minutes_spent
on public.time_entries
for each row execute function public.refresh_project_health_after_time_entry_change();

notify pgrst, 'reload schema';
