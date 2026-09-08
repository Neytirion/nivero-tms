-- Delivery health demo data.
-- 1. Apply migration 202609081300_project_health_metrics.sql first.
-- 2. Replace the email below with an existing Supabase Auth user.
-- 3. Run the complete script in Supabase SQL Editor.
-- Re-running replaces only this user's projects whose names start with [DEMO].

begin;

do $$
declare
  v_owner_email constant text := 'YOUR_EMAIL@example.com';
  v_owner_id uuid;
  v_project_id uuid;
  v_estimate_id uuid;
  v_package_id uuid;
  v_blocker_task_id uuid;
  v_blocked_task_id uuid;
  v_time_base_date date;
  v_scenario record;
  v_package record;
  v_task record;
  v_package_ids jsonb;
begin
  select id
  into v_owner_id
  from auth.users
  where lower(email) = lower(v_owner_email)
  limit 1;

  if v_owner_id is null then
    raise exception 'Auth user with email % was not found. Update v_owner_email at the top of the script.', v_owner_email;
  end if;

  -- SQL Editor has no end-user JWT. Scope these claims to this transaction so
  -- permission triggers evaluate the inserts as actions by the demo owner.
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  delete from public.time_entries te
  using public.projects p
  where te.project_id = p.id
    and p.owner_id = v_owner_id
    and p.name like '[DEMO] %';

  delete from public.projects
  where owner_id = v_owner_id
    and name like '[DEMO] %';

  select current_date + offsets.day_offset
  into v_time_base_date
  from generate_series(-365, 365) as offsets(day_offset)
  where not exists (
    select 1
    from public.time_entries existing_entry
    where existing_entry.user_id = v_owner_id
      and existing_entry.started_at is not null
      and existing_entry.ended_at is not null
      and exists (
        select 1
        from generate_series(1, 6) as scenario_orders(scenario_order)
        cross join generate_series(1, 5) as task_orders(task_order)
        cross join generate_series(0, 1) as segments(segment_order)
        where scenario_orders.scenario_order <> 5
          and tstzrange(existing_entry.started_at, existing_entry.ended_at, '[)')
            && tstzrange(
              (
                (current_date + offsets.day_offset)
                - ((scenario_orders.scenario_order - 1) * 5 + task_orders.task_order - 1)
              )::timestamp
                + case when segments.segment_order = 0 then time '08:00' else time '13:30' end,
              (
                (current_date + offsets.day_offset)
                - ((scenario_orders.scenario_order - 1) * 5 + task_orders.task_order - 1)
              )::timestamp
                + case when segments.segment_order = 0 then time '12:30' else time '18:00' end,
              '[)'
            )
      )
  )
  order by abs(offsets.day_offset), offsets.day_offset
  limit 1;

  if v_time_base_date is null then
    raise exception 'Unable to find a free date window for demo time entries.';
  end if;

  for v_scenario in
    select *
    from (values
      (
        1,
        '[DEMO] 01 Healthy delivery',
        'Green: 40% delivered, 38% of baseline hours used.',
        true, 'active', 38::numeric, 1.00::numeric, 6,
        current_date - 2, current_date + 28,
        false
      ),
      (
        2,
        '[DEMO] 02 Forecast warning',
        'Yellow: 70% delivered, 77% of hours used, forecast at completion is 110%.',
        true, 'active', 92.4::numeric, 1.20::numeric, 11,
        current_date - 2, current_date + 28,
        false
      ),
      (
        3,
        '[DEMO] 03 Budget overrun',
        'Red: 70% delivered while 90% of baseline hours are already used.',
        true, 'active', 72::numeric, 0.80::numeric, 11,
        current_date - 2, current_date + 28,
        false
      ),
      (
        4,
        '[DEMO] 04 Schedule and blocker risk',
        'Red: delivery is behind schedule and an overdue task has an unresolved blocker.',
        true, 'active', 49::numeric, 1.40::numeric, 6,
        current_date - 40, current_date + 5,
        true
      ),
      (
        5,
        '[DEMO] 05 No baseline',
        'Unknown: task-count progress is available, but no approved estimate or planned hours exist.',
        false, 'active', 0::numeric, 0.90::numeric, 9,
        null::date, null::date,
        false
      ),
      (
        6,
        '[DEMO] 06 Completed within baseline',
        'Green: completed scope used 95% of approved baseline hours.',
        true, 'completed', 152::numeric, 1.60::numeric, 18,
        current_date - 60, current_date - 1,
        false
      )
    ) as scenarios(
      scenario_order,
      name,
      description,
      use_estimates,
      status,
      actual_hours,
      estimate_multiplier,
      completed_task_count,
      start_date,
      end_date,
      has_blocked_overdue_task
    )
  loop
    v_blocker_task_id := null;
    v_blocked_task_id := null;
    v_package_ids := '{}'::jsonb;

    insert into public.projects (
      name,
      description,
      customer_name,
      owner_id,
      project_manager_id,
      start_date,
      end_date,
      deadline_at,
      estimated_hours,
      budget_amount,
      status,
      completed_at,
      use_estimates
    ) values (
      v_scenario.name,
      v_scenario.description,
      'Nivero Demo Customer',
      v_owner_id,
      v_owner_id,
      v_scenario.start_date,
      v_scenario.end_date,
      v_scenario.end_date,
      case when v_scenario.use_estimates then 100 * v_scenario.estimate_multiplier else null end,
      case when v_scenario.use_estimates then 100000 else null end,
      v_scenario.status,
      case when v_scenario.status = 'completed' then now() else null end,
      v_scenario.use_estimates
    ) returning id into v_project_id;

    insert into public.estimates (
        project_id,
        version_number,
        status,
        created_by,
        approved_at,
        price_per_hour
      ) values (
        v_project_id,
        1,
        case when v_scenario.use_estimates then 'approved' else 'draft' end,
        v_owner_id,
        case when v_scenario.use_estimates then now() else null end,
        case when v_scenario.use_estimates then 1000 else null end
      ) returning id into v_estimate_id;

    for v_package in
      select *
      from (values
        ('UX/UI', 15::numeric, 0, '#db2777'),
        ('Backend/Integrations', 25::numeric, 1, '#0891b2'),
        ('Frontend', 25::numeric, 2, '#2563eb'),
        ('Test and QA', 15::numeric, 3, '#16a34a'),
        ('Iterations', 10::numeric, 4, '#d97706'),
        ('Project management', 10::numeric, 5, '#64748b')
      ) as packages(name, estimated_hours, sort_order, color)
    loop
      insert into public.work_packages (
        estimate_id,
        name,
        estimated_hours,
        sort_order,
        is_active,
        color
      ) values (
        v_estimate_id,
        v_package.name,
        v_package.estimated_hours * v_scenario.estimate_multiplier,
        v_package.sort_order,
        true,
        v_package.color
      ) returning id into v_package_id;

      v_package_ids := v_package_ids || jsonb_build_object(v_package.name, v_package_id::text);
    end loop;

    for v_task in
      select *
      from (values
        (1, 'UX/UI', 'User research and journey mapping', 5::numeric, 5::numeric, 'medium'),
        (2, 'UX/UI', 'Wireframes and interaction flows', 5::numeric, 10::numeric, 'medium'),
        (3, 'UX/UI', 'Visual design system', 5::numeric, 15::numeric, 'high'),
        (4, 'Backend/Integrations', 'Service architecture', 5::numeric, 20::numeric, 'high'),
        (5, 'Backend/Integrations', 'Core data model and API', 10::numeric, 30::numeric, 'high'),
        (6, 'Backend/Integrations', 'External systems integration', 10::numeric, 40::numeric, 'high'),
        (7, 'Frontend', 'Application shell and navigation', 5::numeric, 45::numeric, 'medium'),
        (8, 'Frontend', 'Core project views', 10::numeric, 55::numeric, 'high'),
        (9, 'Frontend', 'Forms and validation', 5::numeric, 60::numeric, 'medium'),
        (10, 'Frontend', 'Responsive states and accessibility', 5::numeric, 65::numeric, 'medium'),
        (11, 'Test and QA', 'Test plan and acceptance criteria', 5::numeric, 70::numeric, 'medium'),
        (12, 'Test and QA', 'Integration and API testing', 5::numeric, 75::numeric, 'high'),
        (13, 'Test and QA', 'Regression and release verification', 5::numeric, 80::numeric, 'high'),
        (14, 'Iterations', 'Stakeholder feedback cycle', 4::numeric, 84::numeric, 'medium'),
        (15, 'Iterations', 'Usability and performance polish', 6::numeric, 90::numeric, 'medium'),
        (16, 'Project management', 'Planning and project controls', 3::numeric, 93::numeric, 'medium'),
        (17, 'Project management', 'Stakeholder reporting', 3::numeric, 96::numeric, 'medium'),
        (18, 'Project management', 'Release coordination', 4::numeric, 100::numeric, 'high')
      ) as tasks(task_order, package_name, title, estimated_hours, cumulative_hours, priority)
    loop
      insert into public.tasks (
          project_id,
          work_package_id,
          title,
          description,
          status,
          priority,
          assigned_to,
          created_by,
          estimate_hours,
          due_date,
          is_billable
        ) values (
          v_project_id,
          (v_package_ids ->> v_task.package_name)::uuid,
          v_task.title,
          format('Demo task in %s (%s baseline hours).', v_task.package_name, v_task.estimated_hours * v_scenario.estimate_multiplier),
          case
            when v_task.task_order <= v_scenario.completed_task_count then 'done'
            when v_task.task_order = v_scenario.completed_task_count + 1 then 'in_progress'
            when v_task.task_order = v_scenario.completed_task_count + 2 then 'review'
            else 'todo'
          end,
          v_task.priority,
          v_owner_id,
          v_owner_id,
          v_task.estimated_hours * v_scenario.estimate_multiplier,
          case
            when v_scenario.has_blocked_overdue_task
              and v_task.title = 'Regression and release verification'
              then current_date - 5
            else v_scenario.end_date
          end,
          true
      ) returning id into v_blocker_task_id;

      if v_task.title = 'Regression and release verification' then
        v_blocked_task_id := v_blocker_task_id;
      end if;
    end loop;

    if v_scenario.has_blocked_overdue_task then
      select id into v_blocker_task_id
      from public.tasks
      where project_id = v_project_id
        and title = 'Responsive states and accessibility';

      update public.tasks
      set blocked_by_task_id = v_blocker_task_id
      where id = v_blocked_task_id;
    end if;

    if v_scenario.actual_hours > 0 then
      insert into public.time_entries (
        user_id,
        project_id,
        task_id,
        entry_date,
        minutes_spent,
        is_billable,
        started_at,
        ended_at
      )
      select
        v_owner_id,
        v_project_id,
        task_rows.id,
        v_time_base_date - ((v_scenario.scenario_order - 1) * 5 + task_rows.task_order - 1),
        round(v_scenario.actual_hours * 60 / 10)::integer,
        true,
        (v_time_base_date - ((v_scenario.scenario_order - 1) * 5 + task_rows.task_order - 1))::timestamp
          + case when segments.segment_order = 0 then time '08:00' else time '13:30' end,
        (v_time_base_date - ((v_scenario.scenario_order - 1) * 5 + task_rows.task_order - 1))::timestamp
          + case when segments.segment_order = 0 then time '12:30' else time '18:00' end
      from (
        select t.id, row_number() over (order by t.created_at, t.id)::integer as task_order
        from public.tasks t
        where t.project_id = v_project_id
        order by t.created_at, t.id
        limit 5
      ) task_rows
      cross join lateral generate_series(0, 1) as segments(segment_order);
    end if;

    perform public.recalc_project_health(v_project_id);
  end loop;
end;
$$;

commit;

select
  p.name,
  (select count(*) from public.work_packages wp join public.estimates e on e.id = wp.estimate_id where e.project_id = p.id) as work_packages,
  (select count(*) from public.tasks t where t.project_id = p.id) as tasks,
  p.progress_percent as progress,
  p.hours_consumed_percent as hours_used,
  p.hours_variance_percent as variance,
  p.expected_progress_percent as expected_progress,
  p.forecast_at_completion_percent as forecast,
  p.risk_status as risk,
  p.risk_reason
from public.projects p
where p.name like '[DEMO] %'
order by p.name;