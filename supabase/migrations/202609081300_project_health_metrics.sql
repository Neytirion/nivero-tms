alter table public.projects
  add column if not exists baseline_hours numeric(10,2),
  add column if not exists hours_consumed_percent numeric(7,2),
  add column if not exists expected_progress_percent numeric(5,2),
  add column if not exists hours_variance_percent numeric(7,2),
  add column if not exists forecast_at_completion_percent numeric(7,2),
  add column if not exists risk_reason text;

alter table public.projects drop constraint if exists projects_risk_status_check;
alter table public.projects
  add constraint projects_risk_status_check
  check (risk_status in ('unknown', 'green', 'yellow', 'red'));

create or replace function public.recalc_project_health(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_approved_estimate_id uuid;
  v_baseline_hours numeric := 0;
  v_actual_hours numeric := 0;
  v_total_tasks integer := 0;
  v_done_tasks integer := 0;
  v_done_estimated_hours numeric := 0;
  v_progress numeric := 0;
  v_consumed numeric;
  v_expected numeric;
  v_variance numeric;
  v_forecast numeric;
  v_total_working_days integer := 0;
  v_elapsed_working_days integer := 0;
  v_overdue_tasks integer := 0;
  v_blocked_overdue_tasks integer := 0;
  v_risk text := 'unknown';
  v_reason text := 'No approved baseline or planned hours';
begin
  if p_project_id is null then
    return;
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    return;
  end if;

  select e.id into v_approved_estimate_id
  from public.estimates e
  where e.project_id = p_project_id
    and e.status = 'approved'
  order by e.version_number desc
  limit 1;

  if v_approved_estimate_id is not null then
    select coalesce(sum(wp.estimated_hours), 0)
    into v_baseline_hours
    from public.work_packages wp
    where wp.estimate_id = v_approved_estimate_id
      and wp.is_active;
  else
    v_baseline_hours := coalesce(v_project.estimated_hours, 0);
  end if;

  select
    count(*),
    count(*) filter (where lower(coalesce(t.status, '')) in ('done', 'completed', 'complete', 'closed')),
    coalesce(sum(
      case
        when lower(coalesce(t.status, '')) in ('done', 'completed', 'complete', 'closed')
          then greatest(coalesce(t.estimate_hours, 0), 0)
        else 0
      end
    ), 0),
    count(*) filter (
      where lower(coalesce(t.status, '')) not in ('done', 'completed', 'complete', 'closed')
        and t.due_date < current_date
    ),
    count(*) filter (
      where lower(coalesce(t.status, '')) not in ('done', 'completed', 'complete', 'closed')
        and t.due_date < current_date
        and exists (
          select 1
          from public.tasks blocker
          where blocker.id = t.blocked_by_task_id
            and lower(coalesce(blocker.status, '')) not in ('done', 'completed', 'complete', 'closed')
        )
    )
  into v_total_tasks, v_done_tasks, v_done_estimated_hours, v_overdue_tasks, v_blocked_overdue_tasks
  from public.tasks t
  where t.project_id = p_project_id;

  select round(coalesce(sum(te.minutes_spent), 0)::numeric / 60.0, 2)
  into v_actual_hours
  from public.time_entries te
  where te.project_id = p_project_id;

  if lower(coalesce(v_project.status, '')) = 'completed' then
    v_progress := 100;
  elsif coalesce(v_project.use_estimates, false) and v_baseline_hours > 0 then
    v_progress := least(100, round(v_done_estimated_hours / v_baseline_hours * 100, 2));
  elsif v_total_tasks > 0 then
    v_progress := round(v_done_tasks::numeric / v_total_tasks::numeric * 100, 2);
  end if;

  if v_baseline_hours > 0 then
    v_consumed := round(v_actual_hours / v_baseline_hours * 100, 2);
    v_variance := round(v_consumed - v_progress, 2);

    if v_progress >= 10 then
      v_forecast := round(v_consumed / (v_progress / 100.0), 2);
    end if;

    if v_project.start_date is not null and v_project.end_date is not null then
      select count(*)::integer into v_total_working_days
      from generate_series(v_project.start_date, v_project.end_date, interval '1 day') day
      where extract(isodow from day) between 1 and 5;

      if current_date >= v_project.start_date and v_total_working_days > 0 then
        select count(*)::integer into v_elapsed_working_days
        from generate_series(
          v_project.start_date,
          least(current_date, v_project.end_date),
          interval '1 day'
        ) day
        where extract(isodow from day) between 1 and 5;

        v_expected := least(100, round(v_elapsed_working_days::numeric / v_total_working_days * 100, 2));
      else
        v_expected := 0;
      end if;
    end if;

    v_risk := 'green';
    v_reason := 'Delivery progress is aligned with the approved baseline';

    if v_variance > 20 then
      v_risk := 'red';
      v_reason := format('Hours consumed are %s percentage points ahead of delivery progress', round(v_variance, 1));
    elsif v_variance > 10 then
      v_risk := 'yellow';
      v_reason := format('Hours consumed are %s percentage points ahead of delivery progress', round(v_variance, 1));
    end if;

    if v_forecast > 115 then
      v_risk := 'red';
      v_reason := format('Current efficiency forecasts %s%% of baseline hours at completion', round(v_forecast, 1));
    elsif v_forecast > 105 and v_risk = 'green' then
      v_risk := 'yellow';
      v_reason := format('Current efficiency forecasts %s%% of baseline hours at completion', round(v_forecast, 1));
    end if;

    if v_expected is not null and v_expected - v_progress > 20 then
      v_risk := 'red';
      v_reason := format('Delivery progress is %s percentage points behind schedule', round(v_expected - v_progress, 1));
    elsif v_expected is not null and v_expected - v_progress > 10 and v_risk = 'green' then
      v_risk := 'yellow';
      v_reason := format('Delivery progress is %s percentage points behind schedule', round(v_expected - v_progress, 1));
    end if;

    if v_blocked_overdue_tasks > 0 then
      v_risk := 'red';
      v_reason := format('%s overdue task(s) are blocked', v_blocked_overdue_tasks);
    elsif v_overdue_tasks > 0 and v_risk = 'green' then
      v_risk := 'yellow';
      v_reason := format('%s incomplete task(s) are overdue', v_overdue_tasks);
    end if;

    if v_project.end_date < current_date and v_progress < 100 then
      v_risk := 'red';
      v_reason := 'Project end date has passed with incomplete scope';
    end if;
  end if;

  update public.projects
  set
    baseline_hours = nullif(v_baseline_hours, 0),
    actual_hours = v_actual_hours,
    progress_percent = least(100, greatest(0, v_progress)),
    hours_consumed_percent = v_consumed,
    expected_progress_percent = v_expected,
    hours_variance_percent = v_variance,
    forecast_at_completion_percent = v_forecast,
    risk_status = v_risk,
    risk_reason = v_reason
  where id = p_project_id
    and (
      baseline_hours,
      actual_hours,
      progress_percent,
      hours_consumed_percent,
      expected_progress_percent,
      hours_variance_percent,
      forecast_at_completion_percent,
      risk_status,
      risk_reason
    ) is distinct from (
      nullif(v_baseline_hours, 0),
      v_actual_hours,
      least(100, greatest(0, v_progress)),
      v_consumed,
      v_expected,
      v_variance,
      v_forecast,
      v_risk,
      v_reason
    );
end;
$$;

create or replace function public.refresh_project_health_after_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_project_health(old.project_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform public.recalc_project_health(old.project_id);
  end if;

  perform public.recalc_project_health(new.project_id);
  return new;
end;
$$;

create or replace function public.refresh_project_health_after_time_entry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_project_health(old.project_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform public.recalc_project_health(old.project_id);
  end if;

  perform public.recalc_project_health(new.project_id);
  return new;
end;
$$;

create or replace function public.refresh_project_health_after_project_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_project_health(new.id);
  return new;
end;
$$;

create or replace function public.recalculate_project_actual_hours(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_project_health(p_project_id);
end;
$$;

create or replace function public.recalculate_project_progress_from_tasks(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_project_health(p_project_id);
end;
$$;

create or replace function public.refresh_project_health_after_estimate_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if tg_table_name = 'estimates' and tg_op = 'DELETE' then
    v_project_id := old.project_id;
  elsif tg_table_name = 'estimates' then
    v_project_id := new.project_id;
  elsif tg_op = 'DELETE' then
    select e.project_id into v_project_id
    from public.estimates e
    where e.id = old.estimate_id;
  else
    select e.project_id into v_project_id
    from public.estimates e
    where e.id = new.estimate_id;
  end if;

  perform public.recalc_project_health(v_project_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_estimates_project_health on public.estimates;
create trigger trg_estimates_project_health
after insert or update or delete on public.estimates
for each row execute function public.refresh_project_health_after_estimate_change();

drop trigger if exists trg_work_packages_project_health on public.work_packages;
create trigger trg_work_packages_project_health
after insert or update or delete on public.work_packages
for each row execute function public.refresh_project_health_after_estimate_change();

drop trigger if exists trg_tasks_project_health on public.tasks;
create trigger trg_tasks_project_health
after insert or update or delete on public.tasks
for each row execute function public.refresh_project_health_after_task_change();

drop trigger if exists trg_time_entries_project_health on public.time_entries;
create trigger trg_time_entries_project_health
after insert or update or delete on public.time_entries
for each row execute function public.refresh_project_health_after_time_entry_change();

drop trigger if exists trg_projects_health_inputs on public.projects;
create trigger trg_projects_health_inputs
after update of start_date, end_date, estimated_hours, use_estimates, status on public.projects
for each row execute function public.refresh_project_health_after_project_change();

create or replace function public.refresh_my_project_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  for v_project_id in
    select p.id
    from public.projects p
    where p.owner_id = v_actor_id
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = p.id
          and pm.user_id = v_actor_id
      )
  loop
    perform public.recalc_project_health(v_project_id);
  end loop;
end;
$$;

revoke all on function public.recalc_project_health(uuid) from public;
revoke all on function public.refresh_project_health_after_estimate_change() from public;
revoke all on function public.refresh_project_health_after_task_change() from public;
revoke all on function public.refresh_project_health_after_time_entry_change() from public;
revoke all on function public.refresh_project_health_after_project_change() from public;
revoke all on function public.refresh_my_project_health() from public;
revoke execute on function public.recalc_project_health(uuid) from authenticated;
revoke execute on function public.recalculate_project_actual_hours(uuid) from authenticated;
revoke execute on function public.recalculate_project_progress_from_tasks(uuid) from authenticated;
grant execute on function public.refresh_my_project_health() to authenticated;

do $$
declare
  v_project_id uuid;
begin
  for v_project_id in select id from public.projects loop
    perform public.recalc_project_health(v_project_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';