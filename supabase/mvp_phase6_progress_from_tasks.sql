-- Phase 6: Progress based on task completion
-- Run after phase1/phase2/phase3/phase4/phase5 scripts.

-- Keep actual hours/risk driven by time entries, but do not override progress_percent here.
create or replace function public.recalculate_project_actual_hours(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes int;
  v_estimated numeric;
  v_actual numeric;
  v_risk text;
begin
  if p_project_id is null then
    return;
  end if;

  select coalesce(sum(te.minutes_spent), 0)
  into v_minutes
  from public.time_entries te
  where te.project_id = p_project_id;

  v_actual := round((v_minutes::numeric / 60.0), 2);

  select coalesce(p.estimated_hours, 0)
  into v_estimated
  from public.projects p
  where p.id = p_project_id;

  if v_estimated <= 0 then
    v_risk := 'green';
  elsif v_actual > v_estimated then
    v_risk := 'red';
  elsif v_actual >= v_estimated * 0.85 then
    v_risk := 'yellow';
  else
    v_risk := 'green';
  end if;

  update public.projects
  set
    actual_hours = v_actual,
    risk_status = v_risk
  where id = p_project_id;
end;
$$;

create or replace function public.recalculate_project_progress_from_tasks(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_tasks int;
  v_done_tasks int;
  v_progress numeric;
begin
  if p_project_id is null then
    return;
  end if;

  select count(*)
  into v_total_tasks
  from public.tasks t
  where t.project_id = p_project_id;

  if v_total_tasks = 0 then
    v_progress := 0;
  else
    select count(*)
    into v_done_tasks
    from public.tasks t
    where t.project_id = p_project_id
      and lower(coalesce(t.status, '')) in ('done', 'completed');

    v_progress := round((v_done_tasks::numeric / v_total_tasks::numeric) * 100.0, 2);
  end if;

  update public.projects
  set progress_percent = least(100, greatest(0, v_progress))
  where id = p_project_id;
end;
$$;

create or replace function public.tasks_progress_rollup_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_project_progress_from_tasks(new.project_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.project_id is distinct from new.project_id then
      perform public.recalculate_project_progress_from_tasks(old.project_id);
    end if;

    perform public.recalculate_project_progress_from_tasks(new.project_id);
    return new;
  end if;

  perform public.recalculate_project_progress_from_tasks(old.project_id);
  return old;
end;
$$;

drop trigger if exists trg_tasks_progress_rollup on public.tasks;
create trigger trg_tasks_progress_rollup
after insert or update or delete on public.tasks
for each row
execute function public.tasks_progress_rollup_trigger();

-- Backfill all projects for consistent values after migration.
do $$
declare
  v_project_id uuid;
begin
  for v_project_id in
    select p.id from public.projects p
  loop
    perform public.recalculate_project_actual_hours(v_project_id);
    perform public.recalculate_project_progress_from_tasks(v_project_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
